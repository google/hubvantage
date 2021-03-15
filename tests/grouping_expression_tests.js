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
 * @fileoverview This file contains unit tests for the QueryExpression object.
 * All unit tests are defined as functions in the groupingExpressionTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console
 * @package
 */
function runGroupingExpressionTest() {
  Assert.runTests(groupingExpressionTestObject);

}

/**
 * list of unit test function. function name is:
 * methodToTest_testScenario_outcome
 */
let groupingExpressionTestObject = {
  /******************************************************************
   *                       VALID INPUT TESTS                        *
   ******************************************************************/
  getQuerySyntaxString_ContainsSingleFilterIntValueInt_undefined: function() {
    let userInputFilter = 'Placement ID';
    let condition = SQL_OPERATORS.CONTAIN;
    let value = 333;
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = undefined;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_ContainsSingleInt_outputString: function() {
    let userInputFilter = 'Placement';
    let sqlFilterName = 'placement';
    let condition = SQL_OPERATORS.CONTAIN;
    let value = 333;
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} LIKE '%${value}%'`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_ContainsIntArray_outputString: function() {
    let userInputFilter = 'Placement ID';
    let sqlFilterName = 'placement_id';
    let condition = SQL_OPERATORS.IN;
    let value = [333, 111];
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} IN (${value})`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_ContainsSingleString_outputString: function() {
    let userInputFilter = 'Placement';
    let sqlFilterName = 'placement';
    let condition = SQL_OPERATORS.CONTAIN;
    let value = 'Trv';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} LIKE '%${value}%'`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_ContainsCollectionString_outputString: function() {
    let userInputFilter = 'Placement';
    let sqlFilterName = 'placement';
    let condition = SQL_OPERATORS.CONTAIN;
    let value = 'GP,--,\',`';
    let expectedValue = `GP,--,\\',\``;
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} LIKE '%${expectedValue}%'`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_EqualsSingleInt_outputString: function() {
    let userInputFilter = 'Placement ID';
    let sqlFilterName = 'placement_id';
    let condition = SQL_OPERATORS.EQUAL;
    let value = 111;
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} = ${value}`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_EqualsIntArray_undefined: function() {
    let userInputFilter = 'Placement ID';
    let condition = SQL_OPERATORS.EQUAL;
    let value = [111, 1234];
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = undefined;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_EqualsSingleString_outputString: function() {
    let userInputFilter = 'Placement';
    let sqlFilterName = 'placement';
    let condition = SQL_OPERATORS.EQUAL;
    let value = 'placementName';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} = '${value}'`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_EqualsStringArray_undefined: function() {
    let userInputFilter = 'Placement';
    let condition = SQL_OPERATORS.EQUAL;
    let value = '111, 1234';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = undefined;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_InSingleInt_outputString: function() {
    let userInputFilter = 'Placement ID';
    let sqlFilterName = 'placement_id';
    let condition = SQL_OPERATORS.IN;
    let value = 123;
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} IN (${value})`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },
  getQuerySyntaxString_InIntArray_outputString: function() {
    let userInputFilter = 'Placement ID';
    let sqlFilterName = 'placement_id';
    let condition = SQL_OPERATORS.IN;
    let value = [123, 1234, 12345];
    let expectedValue = '123,1234,12345';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} IN (${expectedValue})`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_InSingleString_outputString: function() {
    let userInputFilter = 'Placement ID';
    let sqlFilterName = 'placement_id';
    let condition = SQL_OPERATORS.IN;
    let value = '666';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} IN (${value})`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  getQuerySyntaxString_InStringArray_outputString: function() {
    let userInputFilter = 'Campaign'
    let sqlFilterName = 'campaign';
    let condition = SQL_OPERATORS.IN;
    let value = ['Brand', 'Test'];
    let expectedValue = '\'Brand\',\'Test\'';
    let groupingExpression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let actualResult = groupingExpression.getQuerySyntaxString();
    let expectedResult = `${sqlFilterName} IN (${expectedValue})`;
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },


  /******************************************************************
   *                     INVALID INPUT TESTS                        *
   ******************************************************************/
  isValid_invalidFilter_false: function() {
    let expectedResult = false;
    let filter = 'InvalidFilter';
    let condition = 'IN';
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  isValid_filterIsNull_false: function() {
    let expectedResult = false;
    let filter = null;
    let condition = 'IN';
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },
  isValid_filterIsUndefined_false: function() {
    let expectedResult = false;
    let filter = null;
    let condition = 'IN';
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  isValid_invalidCondition_false: function() {

    let expectedResult = false;
    let filter = 'Campaign';
    let condition = 'InvalidCondition';
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);

  },

  isValid_conditionIsNull_false: function() {

    let expectedResult = false;
    let filter = 'Campaign';
    let condition = null;
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);

  },

  isValid_conditionIsUndefined_false: function() {

    let expectedResult = false;
    let filter = 'Campaign';
    let condition = undefined;
    let value = 333;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);

  },

  isValid_valueIsUndefined_false: function() {

    let expectedResult = false;
    let filter = 'Campaign';
    let condition = 'IN';
    let value = undefined;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);

  },

  isValid_valueIsNull_false: function() {

    let expectedResult = false;
    let filter = 'Campaign';
    let condition = 'IN';
    let value = null;
    let reportConfig = getDefaultDynamicReport('').groupingParams;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  isValid_undefinedReportObject_false: function() {
    let expectedResult = false;
    let filter = 'Campaign';
    let condition = 'IN';
    let value = 333;
    let reportConfig = undefined;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },

  isValid_reportObjectIsNull_false: function() {
    let expectedResult = false;
    let filter = 'Campaign';
    let condition = 'IN';
    let value = 333;
    let reportConfig = null;
    let groupingExpression = new QueryExpression(filter, condition,
        value, reportConfig);
    let actualResult = groupingExpression.isValid();
    Assert.isEqual(actualResult, expectedResult, arguments.callee.name);
  },
}
