from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    CfnOutput,
    RemovalPolicy,
    CfnParameter,
    aws_bedrock as bedrock,
)
from constructs import Construct

class CdkPdfIngestionStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # CDK parameters for user inputs
        role_arn_param = CfnParameter(self, "BedrockRoleArn", 
            type="String",
            description="IAM Role ARN with permissions for Bedrock Knowledge Base"
        )
        collection_arn_param = CfnParameter(self, "OpenSearchCollectionArn",
            type="String",
            description="ARN of your existing OpenSearch Serverless collection"
        )

        # S3 bucket for PDFs
        bucket = s3.Bucket(self, "WellArchitectedPdfBucket",
            versioned=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # Bedrock Knowledge Base resource
        kb = bedrock.CfnKnowledgeBase(self, "KnowledgeBase",
            name="devgenius-kb",
            role_arn=role_arn_param.value_as_string,
            knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
                type="VECTOR",
                vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
                    embedding_model_arn="arn:aws:bedrock:us-east-1::model/cohere.embed-english-v1"
                )
            ),
            storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
                type="OPENSEARCH_SERVERLESS",
                opensearch_serverless_configuration=bedrock.CfnKnowledgeBase.OpenSearchServerlessConfigurationProperty(
                    collection_arn=collection_arn_param.value_as_string,
                    field_mapping=bedrock.CfnKnowledgeBase.FieldMappingProperty(
                        metadata_field="metadata",
                        text_field="text",
                        vector_field="vector"
                    ),
                    vector_index_name="bedrock-index"
                )
            )
        )

        # Lambda to process PDFs and ingest into Bedrock
        fn = lambda_.Function(self, "PdfIngestLambda",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="lambda_function.lambda_handler",
            code=lambda_.Code.from_asset("lambda"),
            environment={
                "PDF_BUCKET": bucket.bucket_name,
                "BEDROCK_KB_ID": kb.attr_knowledge_base_id
            }
        )

        bucket.grant_read(fn)

        # S3 event trigger to invoke Lambda on PDF upload
        notification = s3n.LambdaDestination(fn)
        bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            notification,
            s3.NotificationKeyFilter(suffix=".pdf")
        )

        # CloudFormation outputs
        CfnOutput(self, "PdfBucketName", value=bucket.bucket_name, description="S3 bucket for PDFs")
        CfnOutput(self, "KnowledgeBaseId", value=kb.attr_knowledge_base_id, description="Bedrock KB ID")
        CfnOutput(self, "KnowledgeBaseArn", value=kb.attr_arn, description="Bedrock KB ARN")
