"""
Dataset Generator for PINTAR.ai DistilBERT Classifier
Generates synthetic Manglish/Sarawak Malay transaction classification data.
Uses Qwen 2.5 for realistic dialect variation + manual seed examples.
"""

import csv
import random
import os

# ============================================
# MANUAL SEED EXAMPLES (Authentic Sarawak patterns)
# ============================================
MANUAL_SEEDS = [
    # === PAYMENT_IN (0) ===
    ("Bro dah transfer RM50 untuk pua kumbu", 0),
    ("Kak, dah bayar RM200 utk order kek lapis tu", 0),
    ("Receipt RM150 bayar rotan basket", 0),
    ("Transfer dah masuk RM80 untuk belacan udang", 0),
    ("Payment confirmed RM350 for 5kg lada hitam", 0),
    ("Dah settle RM120 ya, terima kasih banyak", 0),
    ("Bank in RM75 untuk tempoyak, check please", 0),
    ("Bayaran RM500 dah clear, tq boss", 0),
    ("Makcik dah transfer RM45 utk kuih", 0),
    ("RM180 dah masuk akaun utk beras Bario", 0),
    ("Received payment RM90 for handicraft", 0),
    ("Dah bayar cash RM60 tadi", 0),
    ("Online transfer RM250 done, check bank ya", 0),
    ("Payment for laksa paste RM35 dah settle", 0),
    ("Kawan bayar RM100 utk 2 helai songket", 0),
    ("TNG transfer RM55 utk mee kolok kering", 0),
    ("Boss bayar RM400 untuk pesanan tebelian", 0),
    ("Duit RM70 utk ikan terubok masin dah masuk", 0),
    ("Bah, dah bank in RM160 utk sagu", 0),
    ("Settle sudah RM300, tunggu barang sampai", 0),
    ("Dah transfer guna maybank RM95", 0),
    ("Bayar tunai RM140 masa jumpa tadi", 0),
    ("Payment proof RM225 utk jeruk madu", 0),
    ("Kak Lin dah settle RM85 utk kerepek pisang", 0),
    ("Transfer done RM110, check Sarawak Pay ya", 0),
    # === ORDER_IN (1) ===
    ("Order 10kg beras Bario, hantar esok", 1),
    ("Nak order 5 bakul rotan untuk kedai", 1),
    ("Tolong kirim 3 balang tempoyak size besar", 1),
    ("Beli 20 packet mee kolok kering boleh?", 1),
    ("Nak tempah 10 helai pua kumbu untuk event", 1),
    ("Order additional 50 packs belacan udang", 1),
    ("Boleh hantar 5kg lada hitam ke Kuching?", 1),
    ("Mau order kek lapis 3 loyang, bila ready?", 1),
    ("Kirim 10 botol tuak ke Sibu, urgent", 1),
    ("Nak beli linut sagu 5 packet", 1),
    ("Please prepare 8 bakul anyaman utk next week", 1),
    ("Order lagi 15kg ikan terubok masin", 1),
    ("Mau restock laksa paste 20 botol", 1),
    ("Tolong prepare hamper raya, budget RM200", 1),
    ("Nak 10 bungkus kuih jala untuk kenduri", 1),
    ("Ada stock beras Bario 25kg? Mau order", 1),
    ("Book 5 set pinggan tanah liat Iban", 1),
    ("Order ulat mulong 2kg, hantar Kapit", 1),
    ("Nak tempah 100 pcs kuih lapis utk wedding", 1),
    ("Boleh buat custom order manik Bidayuh?", 1),
    ("Ship 30 packs gula apong to KL", 1),
    ("Pre-order durian kampung 20kg", 1),
    ("Nak beli 6 botol minyak kelapa virgin", 1),
    ("Order terung asam 5 balang size L", 1),
    ("Minta quotation utk 50 helai batik Sarawak", 1),
    # === COMPLAINT (2) ===
    ("Barang rosak la, mau refund", 2),
    ("Kenapa lambat sangat hantar? 2 minggu dah", 2),
    ("Eh bro kek lapis ni dah expired la", 2),
    ("Belacan bau tak sedap, quality drop", 2),
    ("Beras ada kutu, tak boleh jual ni", 2),
    ("Pua kumbu koyak masa sampai, packaging teruk", 2),
    ("Wrong order la, saya order size L dapat S", 2),
    ("Mee kolok keras sangat, macam dah lama", 2),
    ("Customer complaint pasal warna pudar", 2),
    ("Ikan terubok terlalu masin, tak sedap", 2),
    ("Barang tak sampai lagi, tracking no movement", 2),
    ("Refund please, product not as described", 2),
    ("Laksa paste bocor dalam parcel, messy", 2),
    ("Kualiti rotan makin teruk, customer marah", 2),
    ("Cancel order la, terlalu lama tunggu", 2),
    ("Kuih dah basi, tak fresh langsung", 2),
    ("Saiz tak sama macam gambar, kecil sangat", 2),
    ("Ada serangga dalam packaging, disgusting", 2),
    ("Tempoyak masam sangat, rasa off", 2),
    ("Return barang, tak puas hati dgn kualiti", 2),
    ("Handicraft pecah masa delivery, no bubble wrap", 2),
    ("Saya nak complain, service sangat slow", 2),
    ("Colour lain dari yang saya order", 2),
    ("Product dah tamat tarikh, bahaya ni", 2),
    ("Minta ganti baru atau refund, tak nak repair", 2),
]


def generate_synthetic_data():
    """
    Generate additional synthetic examples with dialect variation.
    These templates create realistic variations programmatically.
    """
    synthetic = []
    
    # Payment templates
    payment_templates = [
        "Dah {action} RM{amount} untuk {product}",
        "{person} bayar RM{amount} utk {product}",
        "Transfer RM{amount} dah masuk, {product}",
        "Payment RM{amount} confirmed, tq {person}",
        "Settle RM{amount} cash utk {product} tadi",
        "Bank in RM{amount} guna {bank} utk {product}",
        "Receipt RM{amount} bayaran {product}",
        "Sudah clear RM{amount}, {product} ya",
    ]
    
    order_templates = [
        "Nak order {qty} {product}, boleh?",
        "Tolong kirim {qty} {product} ke {location}",
        "Beli {qty} {product} utk {occasion}",
        "Mau {qty} {product}, bila boleh hantar?",
        "Ada stock {product}? Nak {qty}",
        "Pre-order {qty} {product} utk next {time}",
        "Tempah {qty} {product}, budget RM{amount}",
        "Please prepare {qty} {product} by {time}",
    ]
    
    complaint_templates = [
        "{product} {problem}, mau {resolution}",
        "Kenapa {product} {problem}? Tak puas hati",
        "Customer complaint pasal {product} {problem}",
        "Bro {product} ni {problem} la",
        "{product} yang sampai {problem}, nak {resolution}",
        "Quality {product} {problem}, makin teruk",
    ]
    
    actions = ["transfer", "bayar", "bank in", "settle", "clear"]
    persons = ["Bro", "Kak", "Boss", "Makcik", "Pakcik", "Abang", "Kakak"]
    products = [
        "pua kumbu", "beras Bario", "kek lapis", "belacan udang", "lada hitam",
        "mee kolok", "ikan terubok", "laksa paste", "tempoyak", "rotan basket",
        "gula apong", "sagu", "tuak", "kerepek", "kuih jala", "batik Sarawak",
        "minyak kelapa", "terung asam", "ulat mulong", "durian kampung",
        "jeruk madu", "manik Bidayuh", "songket", "anyaman", "linut sagu",
    ]
    locations = ["Kuching", "Sibu", "Miri", "Bintulu", "Kapit", "Sri Aman", "KL", "Johor"]
    banks = ["Maybank", "CIMB", "Sarawak Pay", "TNG", "BSN", "RHB"]
    problems = ["rosak", "pecah", "basi", "expired", "bocor", "koyak", "pudar", "keras", "lembik", "tak fresh"]
    resolutions = ["refund", "ganti baru", "tukar", "return", "cancel"]
    occasions = ["kenduri", "wedding", "raya", "gawai", "Christmas", "kedai", "bazaar"]
    times = ["week", "month", "Friday", "Monday", "tomorrow"]
    quantities = ["5", "10", "15", "20", "25", "30", "2kg", "5kg", "10kg", "3 botol", "5 helai", "10 packet"]
    
    amounts = [str(random.randint(20, 500)) for _ in range(50)]
    
    # Generate payment variations
    for _ in range(75):
        template = random.choice(payment_templates)
        text = template.format(
            action=random.choice(actions),
            amount=random.choice(amounts),
            product=random.choice(products),
            person=random.choice(persons),
            bank=random.choice(banks),
        )
        synthetic.append((text, 0))
    
    # Generate order variations
    for _ in range(75):
        template = random.choice(order_templates)
        text = template.format(
            qty=random.choice(quantities),
            product=random.choice(products),
            location=random.choice(locations),
            occasion=random.choice(occasions),
            time=random.choice(times),
            amount=random.choice(amounts),
        )
        synthetic.append((text, 1))
    
    # Generate complaint variations
    for _ in range(75):
        template = random.choice(complaint_templates)
        text = template.format(
            product=random.choice(products),
            problem=random.choice(problems),
            resolution=random.choice(resolutions),
        )
        synthetic.append((text, 2))
    
    return synthetic


def main():
    """Generate the complete dataset and save to CSV."""
    all_data = list(MANUAL_SEEDS)
    synthetic = generate_synthetic_data()
    all_data.extend(synthetic)
    
    # Shuffle
    random.seed(42)
    random.shuffle(all_data)
    
    # Write CSV
    output_path = os.path.join(os.path.dirname(__file__), "data.csv")
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        for text, label in all_data:
            writer.writerow([text, label])
    
    # Stats
    labels = [row[1] for row in all_data]
    print(f"✅ Dataset generated: {len(all_data)} rows")
    print(f"   PAYMENT_IN (0): {labels.count(0)}")
    print(f"   ORDER_IN   (1): {labels.count(1)}")
    print(f"   COMPLAINT  (2): {labels.count(2)}")
    print(f"   Saved to: {output_path}")


if __name__ == "__main__":
    main()
