import { App } from 'aws-cdk-lib';
import { CdkTsStack } from '../lib/cdk-ts-stack';

const app = new App();
new CdkTsStack(app, 'CdkTsPdfIngestionStack');