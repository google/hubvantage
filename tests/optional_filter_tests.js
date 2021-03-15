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
 * @fileoverview This file contains unit tests for the OptionalFilter object.
 * All unit tests are defined as functions in the optionalFilterTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console
 * @package
 */
function runOptionalFilterTest() {
  Assert.runTests(optionalFilterTestObject);
}

/**
 * list of unit test function. function name is:
 * methodToTest_testScenario_outcome
 */
let optionalFilterTestObject = {
  getQuerySyntaxString_OneExpression_outputString: function() {
    let userInputFilter = 'Advertiser ID';
    let sqlFilterName = 'advertiser_id';
    let condition = SQL_OPERATORS.IN;
    let value = '1234, 5678';
    let expectedValue = '(1234,5678)';
    let expression = new QueryExpression(userInputFilter, condition,
      value, optionalFiltersParamsMock);
    let optionalFilter = new OptionalFilter([expression]);
    let actual = optionalFilter.getQuerySyntaxString();
    let expected =
      `AND ${sqlFilterName} IN ${expectedValue}`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_TwoExpressions_outputString: function() {
    let userInputFilter = 'Advertiser ID';
    let sqlFilterName = 'advertiser_id';
    let condition = SQL_OPERATORS.IN;
    let value = '1234, 5678';
    let expectedValue = '(1234,5678)';
    let expression = new QueryExpression(userInputFilter, condition,
      value, optionalFiltersParamsMock);
    let optionalFilter = new OptionalFilter([expression, expression]);
    let actual = optionalFilter.getQuerySyntaxString();
    let expected =
      `AND ${sqlFilterName} IN ${expectedValue} AND ${sqlFilterName}`
      + ` IN ${expectedValue}`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_ZeroExpressions_undefined: function() {
    let optionalFilter = new OptionalFilter(null);
    let actual = optionalFilter.getQuerySyntaxString();
    let expected = undefined;
    Assert.isEqual(actual, expected, arguments.callee.name);
  }
}
