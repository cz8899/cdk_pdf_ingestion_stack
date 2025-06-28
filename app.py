import aws_cdk as cdk
from cdk_pdf_ingestion_stack.cdk_pdf_ingestion_stack_stack import CdkPdfIngestionStack

app = cdk.App()
CdkPdfIngestionStack(app, "CdkPdfIngestionStack")
app.synth()
