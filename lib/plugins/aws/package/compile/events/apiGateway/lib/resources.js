'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {

  compileResources() {
    const predefinedResources = this.provider.getApiGatewayPredefinedResources();
    const resourcePaths = this.getResourcePaths();

    this.apiGatewayResourceNames = {};
    this.apiGatewayResourceIds = {};
    this.apiGatewayResourceLogicalIds = {};

    predefinedResources.forEach((resource) => {
      this.apiGatewayResourceNames[resource.path] = resource.name;
      this.apiGatewayResourceIds[resource.path] = resource.resourceId;
    });

    // ['users', 'users/create', 'users/create/something']
    resourcePaths.forEach(path => {
      if (predefinedResources.some((r) => r.path === path)) {
        return;
      }
      const pathArray = path.split('/');
      const resourceName = this.provider.naming.normalizePath(path);
      const resourceLogicalId = this.provider.naming.getResourceLogicalId(path);
      const pathPart = pathArray.pop();
      const parentPath = pathArray.join('/');
      const parentRef = this.getResourceId(parentPath);

      this.apiGatewayResourceNames[path] = resourceName;
      this.apiGatewayResourceLogicalIds[path] = resourceLogicalId;

      _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
        [resourceLogicalId]: {
          Type: 'AWS::ApiGateway::Resource',
          Properties: {
            ParentId: parentRef,
            PathPart: pathPart,
            RestApiId: this.provider.getApiGatewayRestApiId(),
          },
        },
      });
    });

    console.error(this.apiGatewayResourceNames);
    console.error(this.apiGatewayResourceIds);
    console.error(this.apiGatewayResourceLogicalIds);
    return BbPromise.resolve();
  },

  getResourcePaths() {
    const paths = _.reduce(this.validated.events, (resourcePaths, event) => {
      let path = event.http.path;

      while (path !== '') {
        if (resourcePaths.indexOf(path) === -1) {
          resourcePaths.push(path);
        }

        const splittedPath = path.split('/');
        splittedPath.pop();
        path = splittedPath.join('/');
      }
      return resourcePaths;
    }, []);
    // (stable) sort so that parents get processed before children
    return _.sortBy(paths, path => path.split('/').length);
  },

  getResourceId(path) {
    if (path === '') {
      return this.provider.getApiGatewayRestApiResourceId();
    }

    if (this.apiGatewayResourceIds[path]) {
      return this.apiGatewayResourceIds[path];
    }
    return { Ref: this.apiGatewayResourceLogicalIds[path] };
  },

  getResourceName(path) {
    if (path === '') {
      return '';
    }
    return this.apiGatewayResourceNames[path];
  },
};
