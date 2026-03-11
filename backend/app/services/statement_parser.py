import re
import logging
from typing import List, Dict, Any
from datetime import datetime
from dateutil.parser import parse as date_parse

logger = logging.getLogger(__name__)

def extract_transactions_from_markdown(markdown_text: str) -> List[Dict[str, Any]]:
    """
    A deterministic rules-based parser that scans LlamaParse's Markdown output
    for bank statement tables and extracts specific columns.
    
    Expected attributes:
    - Date (Column 1)
    - Description (Column 2)
    - Reference No. (Column 3)
    - Debit (Debit Column)
    - Credit (Credit Column)
    - Balance (Balance Column)
    """
    transactions = []
    
    # Simple regex to find markdown table rows: | Date | Desc | ... |
    # Assumes table lines start and end with '|'
    lines = markdown_text.split('\n')
    
    in_table = False
    
    for line in lines:
        line = line.strip()
        if not line.startswith('|') or not line.endswith('|'):
            in_table = False
            continue
            
        # Skip header separators like |---|---|
        if re.match(r'^\|[-\s|]+\|$', line):
            in_table = True
            continue
            
        # Parse standard rows
        cols = [col.strip() for col in line.strip('|').split('|')]
        if len(cols) < 5:
            continue
            
        # Attempt to parse date in col 0
        date_str = cols[0]
        try:
            # Check if it resembles a date before full parsing to avoid false positives
            if re.search(r'\d+', date_str):
                parsed_date = date_parse(date_str, fuzzy=True)
                date_val = parsed_date.strftime("%Y-%m-%d")
            else:
                continue
        except Exception:
            # If col 0 isn't a date, it's probably not a transaction row
            continue
            
        description = cols[1] if len(cols) > 1 else ""
        ref_no = cols[2] if len(cols) > 2 else ""
        
        # The remaining columns depend on bank format (Debit / Credit / Balance)
        # We look for amounts from right to left
        debit = 0.0
        credit = 0.0
        balance = 0.0
        
        if len(cols) >= 6:
            # Standard: Date | Desc | Ref | Debit | Credit | Balance
            debit_str = cols[3]
            credit_str = cols[4]
            balance_str = cols[5]
            debit = _clean_float(debit_str)
            credit = _clean_float(credit_str)
            balance = _clean_float(balance_str)
        elif len(cols) == 5:
            # Format: Date | Desc | Debit | Credit | Balance
            debit = _clean_float(cols[2])
            credit = _clean_float(cols[3])
            balance = _clean_float(cols[4])
            
        if debit == 0.0 and credit == 0.0:
            # Skip if no transaction amount
            continue
            
        transactions.append({
            "date": date_val,
            "description": description,
            "reference_no": ref_no,
            "debit": debit,
            "credit": credit,
            "balance": balance
        })
        
    logger.info(f"[Statement Parser] Extracted {len(transactions)} transactions.")
    return transactions

def _clean_float(val: str) -> float:
    """Removes commas, currency symbols, and casts to float."""
    if not val or val.strip() == "-" or val.strip().lower() == "cr" or val.strip().lower() == "dr":
        return 0.0
    val = re.sub(r'[^\d\.\-]', '', val)
    try:
        return float(val) if val else 0.0
    except ValueError:
        return 0.0

def calculate_base_metrics(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Rules-based aggregation of base metrics requested.
    """
    if not transactions:
        return {
            "adb": 0, "dsr": 0, "volatility": 50,
            "months_analyzed": 1, "monthly_inflow": 0, "monthly_outflow": 0,
            "bounce_count": 0, "lowest_balance": 0
        }
        
    balances = [t["balance"] for t in transactions if t["balance"] != 0]
    debits = [t["debit"] for t in transactions if t["debit"] > 0]
    credits = [t["credit"] for t in transactions if t["credit"] > 0]
    
    adb = sum(balances) / len(balances) if balances else 0
    lowest_balance = min(balances) if balances else 0
    
    total_inflow = sum(credits)
    total_outflow = sum(debits)
    
    # Determine months analyzed by grouping dates
    unique_months = set([t["date"][:7] for t in transactions])
    months_analyzed = max(1, len(unique_months))
    
    monthly_inflow = total_inflow / months_analyzed
    monthly_outflow = total_outflow / months_analyzed
    
    # Calculate AMB (Average Monthly Balance) using month-end string extraction
    sorted_txs = sorted(transactions, key=lambda x: x["date"])
    monthly_end_balances = []
    
    current_month = None
    last_balance = 0
    for t in sorted_txs:
        month = t["date"][:7]
        if current_month is None:
            current_month = month
        
        if month != current_month:
            # End of a month, record the last balance
            monthly_end_balances.append(last_balance)
            current_month = month
            
        last_balance = t["balance"]
        
    # Append the last month's final balance
    if current_month is not None:
        monthly_end_balances.append(last_balance)
        
    if months_analyzed > 1 and monthly_end_balances:
        amb = sum(monthly_end_balances) / len(monthly_end_balances)
    else:
        amb = 0
    
    # Overdraft/bounce heuristic
    bounce_count = sum(1 for t in transactions if "fee" in t["description"].lower() or "bounce" in t["description"].lower() or t["balance"] < 0)
    
    # Volatility heuristic (Revenue variance)
    # Simple StdDev over average credits
    mean_credit = sum(credits) / len(unique_months) if unique_months else 0
    if mean_credit > 0 and len(unique_months) > 1:
        # Simplistic calculation, will be refined in Qwen AI phase
        variance = sum([abs(c - mean_credit) for c in credits]) / mean_credit * 10
    else:
        variance = 30
        
    return {
        "adb": adb,
        "amb": amb,
        "dsr": 0, # Will be calculated by Qwen based on specific debt strings
        "volatility": min(100, variance),
        "months_analyzed": months_analyzed,
        "monthly_inflow": monthly_inflow,
        "monthly_outflow": monthly_outflow,
        "bounce_count": bounce_count,
        "lowest_balance": lowest_balance
    }
