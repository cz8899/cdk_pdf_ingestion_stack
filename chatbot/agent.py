import streamlit as st
import boto3
from chatbot.utils import invoke_bedrock_agent, validate_pdf_ingestion

st.set_page_config(page_title="DevGenius Mini Test", layout="centered")
st.title("🧠 DevGenius Mini Test")

# Input field
user_query = st.text_input("Enter your AWS architecture question:")

# Output area
response_area = st.empty()

# Button to trigger Bedrock Agent
if st.button("Generate Solution"):
    bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='us-west-2')
    response = invoke_bedrock_agent(bedrock_agent, user_query)
    response_area.markdown(response)

# Validate PDF ingestion
if st.checkbox("Check PDF Ingestion"):
    if validate_pdf_ingestion():
        st.success("PDFs are ready for semantic search.")
    else:
        st.error("PDFs not found in Knowledge Base.")