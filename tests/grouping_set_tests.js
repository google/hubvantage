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
 * @fileoverview This file contains unit tests for the GroupingSet object.
 * All unit tests are defined as functions in the groupingSetTestObject
 * with the following naming convention functionName_testCase_expectedOutcome.
 *
 * The global function runs all declared unit test function and logs which
 * functions passed or failed to console
 */
function runGroupingSetTest() {
  Assert.runTests(groupingSetTestObject);
}

/**
 * list of unit test function. function name is:
 * methodToTest_testScenario_outcome
 */
let groupingSetTestObject = {
  /******************************************************************
   *                       VALID INPUT TESTS                        *
   ******************************************************************/
  getQuerySyntaxString_EmptyGroupings_outputString: function () {
      let groupingSet = new GroupingSet([], '');
      let actual = groupingSet.getQuerySyntaxString();
      let expected = `'Overall' as custom_group,`;
      Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_OneExpressionOneGrouping_outputString: function () {
      let expression = new QueryExpression('Placement', SQL_OPERATORS.CONTAIN,
          'Trv', groupingParamsMock);
      let groupings = [];
      let groupingName = 'groupingName';
      let setName = 'Set_Name';
      groupings.push(new Grouping(groupingName, expression));
      let groupingSet = new GroupingSet(groupings, setName);
      let actual = groupingSet.getQuerySyntaxString();
      let expected = `CASE WHEN placement LIKE '%Trv%' THEN '${groupingName}`+
          `' ELSE 'Undefined' END as ${setName},`;

      Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_TwoExpressionsOneGrouping_outputString: function () {
      let expression1 = new QueryExpression('Placement', SQL_OPERATORS.CONTAIN,
          'Trv', groupingParamsMock);
      let expression2 = new QueryExpression('Placement',
          SQL_OPERATORS.NOT_CONTAIN, 'GP,--,\',`', groupingParamsMock);

      let groupingName = 'Trueview';
      let groupings = [];
      groupings.push(new Grouping(groupingName, expression1, expression2));

      let setName = 'Set_Name';
      let groupingSet = new GroupingSet(groupings, setName);
      let actual = groupingSet.getQuerySyntaxString();

      let expectedExpression2Value = `GP,--,\\',\``;;
      let expected = `CASE WHEN placement LIKE '%Trv%' AND placement NOT ` +
          `LIKE '%${expectedExpression2Value}%' THEN '${groupingName}' ELSE `+
          `'Undefined' END as ${setName},`;

      Assert.isEqual(actual, expected, arguments.callee.name);
  },

  getQuerySyntaxString_TwoExpressionsTwoGrouping_outputString: function () {
      let expression1 = new QueryExpression('Placement', SQL_OPERATORS.CONTAIN,
          'Trv', groupingParamsMock);
      let expression2 = new QueryExpression('Placement ID',
          SQL_OPERATORS.EQUAL, 111, groupingParamsMock);

      let groupingName1 = 'Trueview';
      let groupingName2 = 'Display';
      let groupings = [];
      groupings.push(new Grouping(groupingName1, expression1));
      groupings.push(new Grouping(groupingName2, expression2));

      let setName = 'Set_Name';
      let groupingSet = new GroupingSet(groupings, setName);
      let actual = groupingSet.getQuerySyntaxString();

      let expected = `CASE WHEN placement LIKE '%Trv%' THEN '${groupingName1}'`+
          ` WHEN placement_id = 111 THEN '${groupingName2}' ELSE 'Undefined'`+
          ` END as ${setName},`;

      Assert.isEqual(actual, expected, arguments.callee.name);
  },
};
