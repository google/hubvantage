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
 * @fileoverview This file contains unit tests for the Grouping object.
 * All unit tests are defined as functions in the groupingTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console
 * @package
 */
function runGroupingTest() {
  Assert.runTests(groupingTestObject);
}

/**
 * list of unit test function. function name is:
 * methodToTest_testScenario_outcome
 */
let groupingTestObject = {

  /******************************************************************
   *                       VALID INPUT TESTS                        *
   ******************************************************************/
  getQuerySyntaxString_OneExpression_outputString: function() {
    let userInputFilter = 'Placement';
    let sqlFilterName = 'placement';
    let condition = SQL_OPERATORS.CONTAIN;
    let value = 'GP,--,\',`';
    let expectedValue = `GP,--,\\',\``;
    let groupingName = 'Trueview';
    let expression = new QueryExpression(userInputFilter, condition,
        value, groupingParamsMock);
    let grouping = new Grouping(groupingName, expression);
    let actual = grouping.getQuerySyntaxString();
    let expected =
      `WHEN ${sqlFilterName} LIKE '%${expectedValue}%' THEN` +
      ` '${groupingName}'`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_TwoExpressions_outputString: function() {
    let sqlFilterName = 'placement';
    let expectedValue = `GP,--,\\',\``;
    let groupingName = 'Trueview';
    let expression1 = new QueryExpression('Placement',
        SQL_OPERATORS.CONTAIN, 'Trv', groupingParamsMock);
    let expression2 = new QueryExpression('Placement',
        SQL_OPERATORS.NOT_CONTAIN, 'GP,--,\',`', groupingParamsMock);
    let grouping = new Grouping(groupingName, expression1, expression2);
    let actual = grouping.getQuerySyntaxString();
    let expected = `WHEN ${sqlFilterName} LIKE '%Trv%' AND ` +
      `${sqlFilterName} NOT LIKE '%${expectedValue}%' THEN 'Trueview'`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_OneExpressionNameIsEmpty_outputString: function() {
    let sqlFilterName = 'campaign';
    let value = 'Brand, Test1';
    let groupingName = '';
    let expression = new QueryExpression('Campaign', SQL_OPERATORS.CONTAIN,
        value, groupingParamsMock);
    let grouping = new Grouping(groupingName, expression);
    let actual = grouping.getQuerySyntaxString();
    let expected =
      `WHEN ${sqlFilterName} LIKE '%${value}%' THEN '${groupingName}'`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_NameIsInteger_outputString: function() {
    let sqlFilterName = 'campaign';
    let value = 'Brand, Test1';
    let groupingName = 111;
    let expression = new QueryExpression('Campaign', SQL_OPERATORS.CONTAIN,
        value, groupingParamsMock);
    let grouping = new Grouping(groupingName, expression);
    let actual = grouping.getQuerySyntaxString();
    let expected =
      `WHEN ${sqlFilterName} LIKE '%${value}%' THEN '${groupingName}'`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_NameHasSpace_undefined: function() {
    let sqlFilterName = 'campaign';
    let value = 'Brand, Test1';
    let groupingName = 'Name has space';
    let expression = new QueryExpression('Campaign', SQL_OPERATORS.CONTAIN,
        value, groupingParamsMock);
    let grouping = new Grouping(groupingName, expression);
    let actual = grouping.getQuerySyntaxString();
    let expected =
      `WHEN ${sqlFilterName} LIKE '%${value}%' THEN '${groupingName}'`;
    Assert.isEqual(actual, expected, arguments.callee.name);
  },
};
