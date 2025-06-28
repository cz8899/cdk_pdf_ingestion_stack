import boto3
import os
import fitz  # PyMuPDF

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-agent-runtime")

BUCKET = os.environ["PDF_BUCKET"]
KB_ID = os.environ["BEDROCK_KB_ID"]

def lambda_handler(event, context):
    # List all objects in the S3 bucket
    response = s3.list_objects_v2(Bucket=BUCKET)
    for obj in response.get("Contents", []):
        key = obj["Key"]
        if "aws" in key.lower() and key.endswith(".pdf"):
            print(f"Processing: {key}")
            s3obj = s3.get_object(Bucket=BUCKET, Key=key)
            try:
                doc = fitz.open(stream=s3obj["Body"].read(), filetype="pdf")
                full_text = "\n".join([page.get_text() for page in doc])
                bedrock.batch_put_knowledge_base_documents(
                    knowledgeBaseId=KB_ID,
                    documents=[{
                        "documentId": key,
                        "content": {"text": full_text[:10000]},  # truncate if needed
                        "metadata": {"source": key, "type": "s3-upload"}
                    }]
                )
                print("Ingested to KB.")
            except Exception as e:
                print("Failed to parse PDF:", key, str(e))
