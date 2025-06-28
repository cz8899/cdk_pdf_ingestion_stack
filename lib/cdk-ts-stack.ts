import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy, CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as path from 'path';

export class CdkTsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const roleArn = new CfnParameter(this, 'BedrockRoleArn', {
      type: 'String',
      description: 'IAM Role ARN with permissions for Bedrock Knowledge Base'
    });

    const osCollectionArn = new CfnParameter(this, 'OpenSearchCollectionArn', {
      type: 'String',
      description: 'ARN of your existing OpenSearch Serverless collection'
    });

    const pdfBucket = new s3.Bucket(this, 'PdfBucket', {
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

  const kb = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
  name: 'devgenius-kb',
  roleArn: roleArn.valueAsString,
  knowledgeBaseConfiguration: {
    type: 'VECTOR',
    vectorKnowledgeBaseConfiguration: {
      embeddingModelArn: 'arn:aws:bedrock:us-east-1::model/cohere.embed-english-v1'
    }
  },
  storageConfiguration: {
    type: 'OPENSEARCH_SERVERLESS'
    // We’ll add the detailed config below
  }
});

// Manually override the unsupported field
kb.addPropertyOverride("storageConfiguration.OpenSearchServerlessConfiguration", {
  collectionArn: osCollectionArn.valueAsString,
  fieldMapping: {
    metadataField: 'metadata',
    textField: 'text',
    vectorField: 'vector'
  },
  vectorIndexName: 'bedrock-index'
});


    const ingestLambda = new lambda.Function(this, 'PdfIngestLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'lambda_function.lambda_handler',
      memorySize: 512,
      timeout: Duration.seconds(30),
      environment: {
        PDF_BUCKET: pdfBucket.bucketName,
        BEDROCK_KB_ID: kb.attrKnowledgeBaseId
      }
    });

    pdfBucket.grantRead(ingestLambda);

    pdfBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(ingestLambda),
      { suffix: '.pdf' }
    );

    new CfnOutput(this, 'PdfBucketName', {
      value: pdfBucket.bucketName,
      description: 'S3 bucket for PDF uploads'
    });

    new CfnOutput(this, 'KnowledgeBaseId', {
      value: kb.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID'
    });
  }
}
