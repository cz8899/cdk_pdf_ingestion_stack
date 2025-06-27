#!/bin/bash

# Set S3 bucket name (from CDK output)
KB_PDF_BUCKET="devgenius-mini-kb-pdfs"

# Upload PDFs to S3
aws s3 cp docs/aws-well-architected-framework-analytics-lens.pdf s3://$KB_PDF_BUCKET/
aws s3 cp docs/aws-security-best-practices.pdf s3://$KB_PDF_BUCKET/

echo "✅ PDFs uploaded to S3 bucket: $KB_PDF_BUCKET"