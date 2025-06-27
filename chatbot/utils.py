import boto3
import os
from botocore.exceptions import ClientError

def invoke_bedrock_agent(bedrock_client, query: str) -> str:
    try:
        response = bedrock_client.invoke_agent(
            agentId=os.getenv("BEDROCK_AGENT_ID"),
            agentAliasId=os.getenv("BEDROCK_AGENT_ALIAS_ID"),
            inputText=query
        )
        return response['outputText']
    except ClientError as e:
        return f"Error: {e}"

def validate_pdf_ingestion() -> bool:
    """Manually verify PDF ingestion via Bedrock API."""
    bedrock_agent = boto3.client('bedrock-agent', region_name='us-west-2')
    try:
        response = bedrock_agent.list_data_sources(knowledgeBaseId=os.getenv("KNOWLEDGE_BASE_ID"))
        return len(response['dataSourceSummaries']) > 0
    except ClientError:
        return False