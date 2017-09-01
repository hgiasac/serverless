'use strict';

const _ = require('lodash');

module.exports = {
  getMethodAuthorization(http) {
    if (_.get(http, 'authorizer.type') === 'AWS_IAM') {
      return {
        Properties: {
          AuthorizationType: 'AWS_IAM',
        },
      };
    }

    if (http.authorizer) {
      const authorizerLogicalId = this.provider.naming
        .getAuthorizerLogicalId(http.authorizer.name);

      const authorizerArn = http.authorizer.arn;
      const authorizationType = http.authorizer.type
        || (typeof authorizerArn === 'string' && authorizerArn.match(/^arn:aws:cognito-idp/)
          ? 'COGNITO_USER_POOLS' : 'CUSTOM');

      return {
        Properties: {
          AuthorizationType: authorizationType,
          AuthorizerId: http.authorizer.authorizerId || { Ref: authorizerLogicalId },
        },
        DependsOn: http.authorizer.authorizerId ? undefined : authorizerLogicalId,
      };
    }

    return {
      Properties: {
        AuthorizationType: 'NONE',
      },
    };
  },
};
