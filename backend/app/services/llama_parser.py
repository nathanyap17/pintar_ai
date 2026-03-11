import os
import logging

logger = logging.getLogger(__name__)

async def parse_pdf_to_markdown(filepath: str) -> str:
    """
    Uses LlamaParse to convert a PDF into structured Markdown, 
    focusing on highly accurate table extraction.
    """
    try:
        from llama_parse import LlamaParse
        
        api_key = os.getenv("LLAMA_CLOUD_API_KEY")
        if not api_key:
            logger.warning("[LlamaParse] LLAMA_CLOUD_API_KEY is not set.")
            raise ValueError("LlamaParse API key is missing.")

        logger.info(f"[LlamaParse] Extracting markdown from {filepath}")
        
        parser = LlamaParse(
            result_type="markdown",
            api_key=api_key
        )
        
        # aload_data handles asynchronous parsing
        documents = await parser.aload_data(filepath)
        
        markdown_text = "\n\n".join([doc.text for doc in documents])
        logger.info(f"[LlamaParse] Extraction complete. {len(markdown_text)} characters.")
        
        return markdown_text

    except Exception as e:
        logger.error(f"[LlamaParse] Failed to parse document: {str(e)}")
        raise e
