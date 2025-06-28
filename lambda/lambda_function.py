import boto3
import os
import fitz  # PyMuPDF
import uuid

def ingest_pdf_text(text, document_id, metadata_source, kb_id):
    bedrock = boto3.client("bedrock-agent-runtime")
    response = bedrock.batch_put_knowledge_base_documents(
        knowledgeBaseId=kb_id,
        documents=[{
            "documentId": document_id,
            "content": {"text": text[:10000]},
            "metadata": {"source": metadata_source}
        }]
    )
    return response

def process_pdf_stream(pdf_bytes, key, kb_id):
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc_id = str(uuid.uuid4())
        ingest_pdf_text(text, doc_id, key, kb_id)
        print(f"✅ Ingested {key} into KB {kb_id}")
    except Exception as e:
        print(f"❌ Failed to ingest {key}: {str(e)}")

def lambda_handler(event, context):
    bucket = os.environ.get("PDF_BUCKET")
    kb_id = os.environ.get("BEDROCK_KB_ID")

    if event.get("Records"):
        # Triggered by S3 event
        s3 = boto3.client("s3")
        for record in event["Records"]:
            key = record["s3"]["object"]["key"]
            s3obj = s3.get_object(Bucket=bucket, Key=key)
            process_pdf_stream(s3obj["Body"].read(), key, kb_id)
    else:
        # Local test trigger (manual invoke)
        local_dir = "./docs"
        for filename in os.listdir(local_dir):
            if filename.lower().endswith(".pdf") and "aws" in filename.lower():
                filepath = os.path.join(local_dir, filename)
                print(f"🧠 Manually processing {filename}...")
                with open(filepath, "rb") as f:
                    process_pdf_stream(f.read(), filename, kb_id)