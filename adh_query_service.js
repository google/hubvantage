/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Service class to query the ADH API
 */
class AdhQueryService {
  /**
   * Start an ADH job from config and parameter objects
   * @param {!Object<string, *>} jobConfigObj Job Config
   * @param {!Object<string, *>} reportConfigObj Report Config
   * @param {!Array<string>} queryConfigVals Query Config Vals Tuple
   * @param {!Array<string>} reportParamVals Report Parameter Vals Tuple
   * @return {?Array<*>} API (Response, JSON) tuple
   */
  execute(jobConfigObj, reportConfigObj, queryConfigVals, reportParamVals) {
    let adsDataCustomerId = parseInt(queryConfigVals[0]) || 0;
    let primaryAccountCustomerId = parseInt(queryConfigVals[4]) || 0;
    if (!primaryAccountCustomerId || parseInt(primaryAccountCustomerId) <= 0) {
      primaryAccountCustomerId = adsDataCustomerId;
    }

    // timezone default is UTC
    let timezone = queryConfigVals[5];
    if (!timezone || typeof timezone !== 'string' || !timezone.includes('/')) {
      timezone = 'UTC';
    }

    let bqDestTable = this.getBQTableNameFromPrefix_(queryConfigVals[1],
        jobConfigObj.queryName);
    let analysisStartDate = queryConfigVals[2];
    let analysisEndDate = queryConfigVals[3];
    analysisEndDate = (analysisEndDate != 'Invalid Date') ?
        analysisEndDate : new Date();
    // analysis dates cannot be in the future
    // TODO: Move to validateDateRangeForAnalysis()
    if (analysisStartDate > new Date()) {
      return;
    }

    this.validateDateRangeForAnalysis_(analysisStartDate, analysisEndDate);
    let queryParamVals = null;
    let parameterTypes = null;
    let mergeSpec = null;
    if (jobConfigObj.queryName === 'CUSTOM_QUERY_JOB') {
      [parameterTypes, queryParamVals] =
          this.getQueryParameterTypesAndValuesForSavedQuery_(
              jobConfigObj.queryParams);
      mergeSpec = this.getMergeSpecForCustomQuery_(jobConfigObj.mergeParams);
    } else {
      queryParamVals = this.getQueryParameterValues_(jobConfigObj.reportParams,
          reportConfigObj, reportParamVals);
      parameterTypes = this.getParameterTypes_(jobConfigObj.reportParams,
          reportConfigObj.reportParams);
      mergeSpec = this.getMergeSpec_(jobConfigObj.mergeParams);
    }

    let queryExecutionSpec = this.getQueryExecutionSpec_(queryParamVals,
        adsDataCustomerId, analysisStartDate, analysisEndDate,
        primaryAccountCustomerId, timezone);
    let analysisQueryObject = this.getAnalysisQueryObject_(
        jobConfigObj.queryName, jobConfigObj.queryVersion,
        jobConfigObj.queryTxt, parameterTypes, mergeSpec);

    return this.startJob_(primaryAccountCustomerId, queryExecutionSpec,
        analysisQueryObject, bqDestTable);
  }

  /**
   * Check ADH API for job execution status
   * @param {string} jobName Job ID
   * @return {!Array<*>} Tuple (endTime, status, error_message). If job is still
   *     running then endTime will be null and status is ADH_JOB_RUNNING. If
   *     job is done then endTime will be job completion time as Date() and
   *     status may be ADH_JOB_SUCCESS or ADH_JOB_FAILURE, in which case alert
   *     should be set.
   */
  getJobExecutionStatus(jobName) {
    let endTime = null;
    let status = SYSTEM_FAILURE;
    let alert = '';
    let [resp, json] = this.makeApiRequest_('GET', jobName);

    if (resp.getResponseCode() == 200) {
      if (json.done) {
        endTime = new Date(json.metadata.endTime);
        if (json.error != null) {
          status = ADH_JOB_FAILURE;
          alert = `Error Code = ${json.error.code} ` +
              `| Message = ${json.error.message}`;
        } else {
          status = ADH_JOB_SUCCESS;
        }
      } else {
        status = ADH_JOB_RUNNING;
      }
    }

    return [endTime, status, alert];
  }

  /**
   * Start a transient job via ADH API using the API objects
   * @private
   * @param {string|number} customerId ADH Customer ID
   * @param {!Object} queryExecutionSpec ADH API QueryExecutionSpec
   * @param {!Object} analysisQueryObject ADH API AnalysisQuery
   * @param {string} destinationTable Customer BQ table
   * @return {!Array<*>} API (Response, JSON) tuple
   */
  startJob_(customerId, queryExecutionSpec, analysisQueryObject,
      destinationTable) {
    let url = `${this.getUrlPrefix_(customerId)}:startTransient`;
    let payload = this.getStartTransientExecutionPayload_(queryExecutionSpec,
        analysisQueryObject, destinationTable);
    return this.makeApiRequest_('POST', url, payload);
  }

  /**
   * Extract query parameter values from the report and return an object of
   * param objects (based on the configured param type)
   * @private
   * @param {!Array<!Object>} jobParams JobConfig Report Parameters
   * @param {!Object<string, *>} reportConfigObj Report Config
   * @param {!Array<string>} reportParamVals Report Parameter Vals Tuple
   * @return {!Object<string, !Object>}
   */
  getQueryParameterValues_(jobParams, reportConfigObj, reportParamVals) {
    let queryParamValuesObj = {};

    jobParams.forEach(param => {
      let value = reportParamVals[param.reportParamLoc];
      let valueType = reportConfigObj.reportParams[param.reportParamLoc].valueType;
      queryParamValuesObj[param.queryParamName] =
          this.getQueryParamObjFromConfigSheet_(value, valueType);
    });

    return queryParamValuesObj;
  }

  /**
   * Get the param values and param types from the array of parameter lines.
   * Custom Queries have the query parameters configured in a single cell in
   * the sheet rather than in a report configuration. We loop through each line
   * and create a param values object and a param type object
   * @private
   * @param {!Array<string>} queryParamLines
   * @return {!Array<*>} Tuple (paramTypeObj, queryParamValuesObj)
   */
  getQueryParameterTypesAndValuesForSavedQuery_(queryParamLines) {
    let queryParamValuesObj = {};
    let paramTypeObj = {};

    queryParamLines.forEach(paramLine => {
      let paramArr = this.getQueryParamObjForCustomQuery_(paramLine);
      paramTypeObj[paramArr[0]] = paramArr[1];
      queryParamValuesObj[paramArr[0]] = paramArr[2];
    });

    return [paramTypeObj, queryParamValuesObj];
  }

  /**
   * Parse a single line of param config and determine name, type, and value
   * Custom Queries have the query parameters configured in a single cell in
   * the sheet rather than in a report configuration. Each line in the cell
   * needs to be parsed to determine parameter info
   * @private
   * @param {string} paramStr
   * @return {!Array<*>} Tuple (param name, param type, param value)
   */
  getQueryParamObjForCustomQuery_(paramStr) {
    let keyval = this.trimArray_(paramStr.split(':'));

    // validate that there are 3 elements, and all have values
    if (keyval.length !== 3 || keyval.includes('')) {
      throw(`Param line ${paramStr} format is invalid.`);
    }

    // Each data type will require some specific parsing and formatting
    let name = keyval[0];
    let typ = keyval[1].toUpperCase();
    let val = keyval[2];
    let payloadType = null;
    let payloadVal = null;
    switch(typ) {
      case 'STRING':
      case 'INT64':
      case 'DATE':
      case 'TIMESTAMP':
      case 'FLOAT64':
      case 'BOOL':
        payloadType = this.getSimpleQueryParamTypeObj_(typ);
        payloadVal = this.getValueObj_(val);
        break;
      case 'STRING[]':
      case 'INT64[]':
      case 'DATE[]':
      case 'TIMESTAMP[]':
      case 'FLOAT64[]':
      case 'BOOL[]':
        payloadType = this.getArrayQueryParamTypeObj_(typ);
        payloadVal = this.getArrayParamValuesObj_(val);
        break;
      default:
        throw(`Param line ${paramStr} does not have value type in (` +
              `STRING, STRING[], INT64, INT64[], DATE, DATE[], FLOAT64, ` +
              `FLOAT64[], BOOL, BOOL[], TIMESTAMP, TIMESTAMP[])`);
    }

    return [name, payloadType, payloadVal];
  }

  /**
   * Create a ADH API ParameterType object for a simple type
   * @private
   * @param {string} type BQ Simple type
   * @return {!Object<string,*>} Object in the ADH API ParameterType format
   */
  getSimpleQueryParamTypeObj_(type) {
    return {'type': {'type': type}, 'defaultValue': {'value': ''}};
  }

  /**
   * Create a ADH API ParameterType object for arrays
   * @private
   * @param {string} arrType BQ Simple type with array signifier ([])
   * @return {!Object<string,*>} Object in the ADH API ParameterType format
   */
  getArrayQueryParamTypeObj_(arrType) {
    let simpleType = arrType.substring(0, arrType.length - 2);
    return {'type': {'arrayType': {'type': simpleType}},
        'defaultValue': {'value': ''}};
  }

  /**
   * Create a ADH API ParameterValue object for each parameter type
   * @private
   * @param {string} value Value string
   * @param {string} valueType
   * @return {!Object<string, *>} ADH API ParameterValue object
   */
  getQueryParamObjFromConfigSheet_(value, valueType) {
    switch (valueType) {
      case VALUE_TYPE.DATE:
        let dateVal = Utilities.formatDate(value, 'UTC', 'yyyy-MM-dd');
        return this.getValueObj_(dateVal);
      case VALUE_TYPE.ARRAY_OF_NUMBERS:
        if (!this.isCommaSeparatedNumbers_(value)) {
          throw (`Bad value for comma separated number ids - ${value}`);
        }
      case VALUE_TYPE.ARRAY_OF_STRINGS:
        return this.getArrayParamValuesObj_(value);
      case VALUE_TYPE.NUMBER:
      case VALUE_TYPE.POSITIVE_NUMBER:
        if (isNaN(value)) {
          throw (`Bad value for number id - ${value}`);
        }
        let parsedValue = parseInt(value);
        return this.getValueObj_(isNaN(parsedValue) ?
                                '0' : parsedValue.toString());
      case VALUE_TYPE.STRING:
      default:
        return this.getValueObj_(value);
    }
  }

  /**
   * Create a ADH API ParameterValue object for array values
   * @private
   * @param {string} delimitedStr Value string with comma-separated values
   * @return {!Object<string, *>} ADH API ParameterValue object with arrayValue
   */
  getArrayParamValuesObj_(delimitedStr) {
    return {'arrayValue': {'values': this.getArrayValueObjs_(delimitedStr)}};
  }

  /**
   * Create a ADH API ParameterValue object for non-array values
   * @private
   * @param {string} valueStr Value string
   * @return {!Object<string, *>} ADH API ParameterValue object with value
   */
  getValueObj_(valueStr) {
    return {'value': valueStr};
  }

  /**
   * Create an array of ADH API non-array ParameterValues for the arrayValue
   * list
   * @private
   * @param {string} delimitedStr Comma-delimited string
   * @return {!Array<!Object<string, *>>} Array of ADH API ParameterValues
   */
  getArrayValueObjs_(delimitedStr) {
    let valArr = (delimitedStr === null) ? null : delimitedStr.split(',');
    if (valArr == null || valArr.length == 0) {
      return null;
    }

    return valArr.map(val => {
      return this.getValueObj_(val.trim());
    });
  }

  /**
   * Get an object of ADH API ParameterTypes by parameter name keyed by
   * parameter name
   * @private
   * @param {!Array<!Object>} jobReportParams JobConfig Report Parameters
   * @param {!Array<!Object>} reportParams ReportConfig Report Parameters
   * @return {!Object<string, !Object>}
   */
  getParameterTypes_(jobReportParams, reportParams) {
    let queryParamTypesObj = {};
    jobReportParams.forEach(param => {
      queryParamTypesObj[param.queryParamName] = this.getQueryParamTypeObj_(
          reportParams[param.reportParamLoc].valueType);
    });

    return queryParamTypesObj;
  }

  /**
   * Create a ADH API MergeSpec from a JobConfig mergeParams array
   * TODO: Migrate to FilteredRowSummary
   * @private
   * @param {!Array<!Object>} mergeParams Array of merge parameters
   * @return {!Object<string,!Object<string,!Object>>} ADH API MergeSpec
   */
  getMergeSpec_(mergeParams) {
    let columnsSpec = {};

    mergeParams.forEach(param => {
      columnsSpec[param.queryParamName] =
          this.getMergeParamTypeObj_(param.type, param.value);
    });

    return {'columns': columnsSpec};
  }

  /**
   * Create a ADH API MergeSpec from a Custom Query config array
   * Custom Queries have the query merge specs configured in a single cell in
   * the sheet rather than in a report configuration. We loop through each line
   * and add the mergespec columnspec to the array.
   * TODO: Migrate to FilteredRowSummary
   * @private
   * @param {!Array<string>} mergeParamStrArr Array of merge param strings
   * @return {!Object<string,!Object>} ADH API MergeSpec
   */
  getMergeSpecForCustomQuery_(mergeParamStrArr) {
    let columnsSpec = {};

    mergeParamStrArr.forEach(paramStr => {
      let columnSpecVal = this.getMergeParamTypeObjForCustomQuery_(paramStr);
      columnsSpec[columnSpecVal[0]] = columnSpecVal[1];
    });

    return {'columns': columnsSpec};
  }

  /**
   * Get ADH API ParameterType object from VALUE_TYPE enum
   * TODO: Combine with get*QueryParamTypeObj_() functions
   * @private
   * @param {number} paramType VALUE_TYPE enum
   * @return {!Object<string,!Object>} ADH API ParameterType object
   */
  getQueryParamTypeObj_(paramType) {
    switch (paramType) {
      case VALUE_TYPE.DATE:
        return {'type': {'type': 'DATE'}, 'defaultValue': {'value': ''}};
      case VALUE_TYPE.NUMBER:
      case VALUE_TYPE.POSITIVE_NUMBER:
        return {'type': {'type': 'INT64'}, 'defaultValue': {'value': ''}};
      case VALUE_TYPE.ARRAY_OF_NUMBERS:
        return {'type': {'arrayType': {'type': 'INT64'}},
            'defaultValue': {'value': ''}};
      case VALUE_TYPE.ARRAY_OF_STRINGS:
        return {'type': {'arrayType': {'type': 'STRING'}},
            'defaultValue': {'value': ''}};
      case VALUE_TYPE.STRING:
      default:
        return {'type': {'type': 'STRING'}, 'defaultValue': {'value': ''}};
    }
  }

  /**
   * Create a ADH API MergeSpec MergeColumn
   * @private
   * @param {string} type Merge type -- CONSTANT or SUM
   * @param {string|number} value Merge value (if type CONSTANT)
   * @return {!Object<string,*>} ADH API MergeColumn
   */
  getMergeParamTypeObj_(type, value) {
    switch (type) {
      case 'CONSTANT':
        return {'type': 'CONSTANT', 'value': {'value': value}};
      case 'SUM':
      default:
        return {'type': 'SUM'};
    }
  }

  /**
   * Create a ADH API MergeSpec MergeColumn from a parsed mergeParam string
   * @private
   * @param {string} mergeParamStr In format field:sum or field:constant:abc
   * @return {!Array<*>} Tuple (fieldname, Object<string,*>) MergeColumn
   */
  getMergeParamTypeObjForCustomQuery_(mergeParamStr) {
    let keyval = this.trimArray_(mergeParamStr.split(':'));
    // validate that there are >= 2 elements, and all have values
    if (! keyval || keyval.length < 2 || ! keyval[0] || ! keyval[1]) {
      throw(`Merge param line ${mergeParamStr} format is invalid.`);
    }

    let name = keyval[0];

    // Each data type will require some specific parsing and formatting
    // Index 1 is the merge type string
    switch (keyval[1].toUpperCase()) {
      case 'CONSTANT':
        if (keyval.length != 3 || ! keyval[2]) {
          throw('Merge param line ' + mergeParamStr + ' format is invalid.');
        }
        let constantType = {'type': 'CONSTANT', 'value': {'value':  keyval[2]}};
        return [name, constantType];

      case 'SUM':
      default:
        return [name, {'type': 'SUM'}];
    }
  }

  /**
   * Validate that the start date and end date are valid and make sense.
   * Does not return a value; throws an exception if validation failed
   * @private
   * @param {!Date} analysisStartDate
   * @param {!Date} analysisEndDate
   * @return {undefined}
   */
  validateDateRangeForAnalysis_(analysisStartDate, analysisEndDate) {
    // TODO: Make dynamic to ~13 months ago
    const minStartDate = new Date('2019-1-1');

    if (analysisStartDate === 'Invalid Date' ||
        analysisStartDate < minStartDate) {
      throw('Invalid date parameters found in cell ' +
            ADH_CONFIG.ANALYSIS_START_DATE[1]);
    }

    if (analysisEndDate < analysisStartDate) {
      throw('Invalid parameters. Analysis start date is after the end date.');
    }
  }

  /**
   * Create an ADH API QueryExecutionSpec
   * @private
   * @param {!Object} parameterValues ADH API parameterValues object
   * @param {string|number} adsDataCustomerId ADH ID which owns data
   * @param {!Date} analysisStartDate Start Date for the query
   * @param {!Date} analysisEndDate End Date for the query
   * @param {string|number} primaryAccountCustomerId ADH Customer ID
   * @param {string} timezone Timezone for query start and end dates
   * @return {!Object<string,*>} ADH API QueryExecutionSpec
   */
  getQueryExecutionSpec_(parameterValues, adsDataCustomerId, analysisStartDate,
      analysisEndDate, primaryAccountCustomerId, timezone) {
    return {
      'adsDataCustomerId': adsDataCustomerId,
      'matchDataCustomerId': primaryAccountCustomerId,
      'startDate': {
        'year': analysisStartDate.getUTCFullYear(),
        'month': analysisStartDate.getUTCMonth() + 1,
        'day': analysisStartDate.getUTCDate()
      },
      'endDate': {
        'year': analysisEndDate.getUTCFullYear(),
        'month': analysisEndDate.getUTCMonth() + 1,
        'day': analysisEndDate.getUTCDate()
      },
      'timeZone': timezone,
      'parameterValues': parameterValues
    };
  }

  /**
   * Get ADH API AnalysisQuery object
   * @private
   * @param {string} queryName Title of query
   * @param {number} queryVersion Version of HubVantage query; used to create
   *     title
   * @param {string} queryTxt SQL query text
   * @param {!Object<string,!Object>} parameterTypes ADH API parameterTypes
   *     object with any additional parameters exepcted by query
   * @param {!Object<string,!Object>} mergeSpec ADH API instructions for row
   *     merge
   * @return {!Object<string,*>} ADH API AnalysisQuery object
   */
  getAnalysisQueryObject_(queryName, queryVersion, queryTxt, parameterTypes,
      mergeSpec) {
    return {
      'title': this.getQueryName_(queryName, queryVersion),
      'queryText': queryTxt,
      'parameterTypes': parameterTypes,
      'mergeSpec': mergeSpec
    };
  }

  /**
   * Low level method to make a GET or POST request to ADH API
   * Handles authorization headers (using ScriptApp's OAuth token)
   * @private
   * @param {string} method HTTP Method (GET or POST)
   * @param {string} path URL path (appended to API base path)
   * @param {?Object} payload HTTP POST payload object. Converted to JSON and
   *     added to headers
   * @return {!Array<*>} API (Response, JSON) tuple. GAS HTTPResponse and the
   *     parsed contentText JSON
   */
  makeApiRequest_(method, path, payload) {
    const url = `${this.getApiBasePath_()}${path}`;
    let options = {
      method: method,
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      },
      payload: JSON.stringify(payload),
    };

    let resp = UrlFetchApp.fetch(url, options);
    let respJson = null;
    try {
      respJson = JSON.parse(resp.getContentText());
    } catch (e) {
      Logger.log('Cannot parse JSON response: ' + resp.getContentText());
    }
    return [resp, respJson];
  }

  /**
   * Return ADH API v1 base path (including scheme and domain)
   * @private
   * @return {string}
   */
  getApiBasePath_() {
    return 'https://adsdatahub.googleapis.com/v1/';
  }

  /**
   * Return ADH API URL path prefix for analysisQueries endpoints
   * @private
   * @param {string|number} customerId
   * @return {string} Path prefix
   */
  getUrlPrefix_(customerId) {
    return `customers/${customerId}/analysisQueries/`;
  }

  /**
   * Get BQ table name with job name suffix. Some reports run more than one
   * job. This creates table names with the job name as a suffix.
   * Note that the table to which ADH results are exported will not be the
   * same name as what the user enters.
   * @private
   * @param {string} tableNamePrefix Table name as provided by user
   * @param {string} jobName Job name
   * @return {string} BQ table name
   */
  getBQTableNameFromPrefix_(tableNamePrefix, jobName) {
    //spaces are invalid for destination table name
    return `${tableNamePrefix}_${jobName.toLowerCase().replace(" ", "_")}`;
  }

  /**
   * Get an API request body for startTransient endpoint
   * @private
   * @param {!Object} queryExecutionSpec API QueryExecutionSpec Object
   * @param {!Object} analysisQueryObject API AnalysisQuery Object
   * @param {string} destinationTable Destination table name
   * @return {!Object<string,*>} Request body Object
   */
  getStartTransientExecutionPayload_(queryExecutionSpec, analysisQueryObject,
      destinationTable) {
    return {
      'query': analysisQueryObject,
      'spec': queryExecutionSpec,
      'destTable': destinationTable,
    };
  }

  /**
   * Creates a unique transient query title from the query name and
   * query version
   * @private
   * @param {string} queryName Query Name
   * @param {string} queryVersion Query Version
   * @return {string}
   */
  getQueryName_(queryName, queryVersion) {
    return `HubV_${queryName}_V${queryVersion}_${Utilities.getUuid()}`;
  }

  /**
   * Check if a string is a series of integers separated by commas.
   * Allows whitespace.
   * @private
   * @param {string} str String to check
   * @return {boolean}
   */
  isCommaSeparatedNumbers_(str) {
    try {
      return str.match(/^\s*(\d+\s*,\s*)*\d+\s*$/i) != null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Trim string literals within an array
   * @private
   * @param {!Array<*>} arr Array with items
   * @return {!Array<*>} Trimmed array
   */
  trimArray_(arr) {
    return arr.map(s => (typeof s === 'string') ? s.trim() : s);
  }
}
