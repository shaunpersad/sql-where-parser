# API
 - [#parse(sql:String):Object](#sqlwhereparser-api-methods-parsesqlstringobject)
 - [#parse(sql:String, evaluator:Function):*](#sqlwhereparser-api-methods-parsesqlstring-evaluatorfunction)
 - [#toArray(sql:String):Array](#sqlwhereparser-api-methods-toarraysqlstringarray)
 - [#operatorPrecedenceFromValues(operatorValue1:String|Symbol, operatorValue2:String|Symbol):Boolean](#sqlwhereparser-api-methods-operatorprecedencefromvaluesoperatorvalue1stringsymbol-operatorvalue2stringsymbolboolean)
 - [#getOperator(operatorValue:String|Symbol):Operator](#sqlwhereparser-api-methods-getoperatoroperatorvaluestringsymboloperator)
 - [#defaultEvaluator(operatorValue:String|Symbol, operands:Array)](#sqlwhereparser-api-methods-defaultevaluatoroperatorvaluestringsymbol-operandsarray)
 - [#tokenizer:TokenizeThis](#sqlwhereparser-api-methods-tokenizertokenizethis)
 - [#operators:Object](#sqlwhereparser-api-methods-operatorsobject)
 - [.defaultConfig:Object](#sqlwhereparser-api-methods-defaultconfigobject)
 - [.Operator:Operator](#sqlwhereparser-api-methods-operatoroperator)
 - [.OPERATOR_UNARY_MINUS:Symbol](#sqlwhereparser-api-methods-operator_unary_minussymbol)


#### #parse(sql:String):Object

Parses the SQL string into an AST with the proper order of operations.

```js
const sql = 'name = "Shaun Persad" AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
const parser = new SqlWhereParser();
const parsed = parser.parse(sql);
/**
 * Original.
 */
//'name = "Shaun Persad" AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
/**
 * Perform equals.
 */
//'(name = "Shaun Persad") AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
/**
 * Perform IN
 */
//'(name = "Shaun Persad") AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
/**
 * Perform AND
 */
//'(((name = "Shaun Persad") AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';
equals(parsed, {
    'AND': [
        {
            'AND': [
                {
                    '=': ['name', 'Shaun Persad']
                },
                {
                    '=': ['job', 'developer']
                }
            ]
        },
        {
            'OR': [
                {
                    '=': ['gender', 'male']
                },
                {
                    'AND': [
                        {
                            'AND': [
                                {
                                    '=': ['type', 'person']
                                },
                                {
                                    'IN': ['location', ['NY', 'America']]
                                }
                            ]
                        },
                        {
                            '=': ['hobby', 'coding']
                        }
                    ]
                }
            ]
        }
    ]
});
```

It handles the unary minus case appropriately.

```js
const parser = new SqlWhereParser();
let parsed = parser.parse('1 + -5');
equals(parsed, {
    '+': [
        1,
        {
            '-': [5]
        }
    ]
});
parsed = parser.parse('-1 + -(5 - - 5)');
equals(parsed, {
    '+': [
        {
            '-': [1]
        },
        {
            '-': [
                {
                    '-': [
                        5,
                        {
                            '-': [5]
                        }
                    ]
                }
            ]
        }
    ]
});
```

It handles the BETWEEN case appropriately.

```js
const parser = new SqlWhereParser();
                    const parsed = parser.parse('A BETWEEN 5 AND 10 AND B = C');
                    equals(parsed, {
                        'AND': [
                            {
                                'BETWEEN': ['A', 5, 10]
                            },
                            {
                                '=': ['B', 'C']
                            }
                        ]
                    });
```

Unnecessarily nested parentheses do not matter.

```js
const sql = '((((name = "Shaun Persad")) AND (age >= 27)))';
                    const parser = new SqlWhereParser();
                    const parsed = parser.parse(sql);
                    equals(parsed, {
                        'AND': [
                            {
                                '=': ['name', 'Shaun Persad'
                                ]
                            },
                            {
                                '>=': ['age', 27]
                            }
                        ]
                    });
```

Throws a SyntaxError if the supplied parentheses do not match.

```js
const sql = '(name = "Shaun Persad" AND age >= 27';
                    const parser = new SqlWhereParser();
                    let failed = false;
                    try {
                        const parsed = parser.parse(sql);
                        failed = false;
                    } catch (e) {
                        failed = (e.constructor === SyntaxError);
                    }
                    if (!failed) {
                        throw new Error('A SyntaxError was not thrown.');
                    }
```


#### #parse(sql:String, evaluator:Function):*

Uses the supplied `evaluator(operatorValue:String|Symbol, operands:Array)` function to convert an operator and its operands into its evaluation. The default evaluator actually does no "evaluation" in the mathematical sense. Instead it creates an object whose key is the operator, and the value is an array of the operands.

```js
let timesCalled = 0;
const sql = 'name = "Shaun Persad" AND age >= 27';
const parser = new SqlWhereParser();
const parsed = parser.parse(sql, (operatorValue, operands) => {
    timesCalled++;
    return parser.defaultEvaluator(operatorValue, operands);
});
timesCalled.should.equal(3);
equals(parsed, {
    'AND': [
        {
            '=': ['name', 'Shaun Persad'
            ]
        },
        {
            '>=': ['age', 27]
        }
    ]
});
```

"Evaluation" is subjective, and this can be exploited to convert the default object-based structure of the AST into something else, like this array-based structure.

```js
const sql = 'name = "Shaun Persad" AND age >= 27';
const parser = new SqlWhereParser();
const parsed = parser.parse(sql, (operatorValue, operands) => {
    return [operatorValue, operands];
});
equals(parsed, [
    'AND',
    [
        ['=',['name', 'Shaun Persad']],
        ['>=', ['age', 27]]
    ]
]);
```


#### #toArray(sql:String):Array

Parses the SQL string into a nested array, where each expression is its own array.

```js
const sql = '(name = "Shaun Persad") AND (age >= (20 + 7))';
const parser = new SqlWhereParser();
const sqlArray = parser.toArray(sql);
equals(sqlArray, [
    ['name', '=', 'Shaun Persad'], 'AND', ['age', '>=', [20, '+', 7]]
]);
```

Unnecessarily nested parentheses do not matter.

```js
const sql = '((((name = "Shaun Persad"))) AND ((age) >= ((20 + 7))))';
const parser = new SqlWhereParser();
const sqlArray = parser.toArray(sql);
equals(sqlArray, [
    ['name', '=', 'Shaun Persad'], 'AND', ['age', '>=', [20, '+', 7]]
]);
```


#### #operatorPrecedenceFromValues(operatorValue1:String|Symbol, operatorValue2:String|Symbol):Boolean

Determines if operator 2 is of a higher precedence than operator 1.

For full precedence list, check the [defaultConfig](#defaultconfigobject) object.

```js
const parser = new SqlWhereParser();
parser.operatorPrecedenceFromValues('AND', 'OR').should.equal(false); // AND is higher than OR
parser.operatorPrecedenceFromValues('+', '-').should.equal(true); // + and - are equal
parser.operatorPrecedenceFromValues('+', '*').should.equal(true); // * is higher than +
```

It also works if either of the operator values are a Symbol instead of a String.

```js
const parser = new SqlWhereParser();
parser.operatorPrecedenceFromValues(SqlWhereParser.OPERATOR_UNARY_MINUS, '-').should.equal(false); // unary minus is higher than minus
```


#### #getOperator(operatorValue:String|Symbol):Operator

Returns the corresponding instance of the Operator class.

```js
const parser = new SqlWhereParser();
const minus = parser.getOperator('-');
minus.should.be.instanceOf(SqlWhereParser.Operator);
minus.should.have.property('value', '-');
minus.should.have.property('precedence', 4);
minus.should.have.property('type', 2); // its binary
```

It also works if the operator value is a Symbol instead of a String.

```js
const parser = new SqlWhereParser();
const unaryMinus = parser.getOperator(SqlWhereParser.OPERATOR_UNARY_MINUS);
unaryMinus.should.be.instanceOf(SqlWhereParser.Operator);
unaryMinus.should.have.property('value', SqlWhereParser.OPERATOR_UNARY_MINUS);
unaryMinus.should.have.property('precedence', 1);
unaryMinus.should.have.property('type', 1); // its unary
```


#### #defaultEvaluator(operatorValue:String|Symbol, operands:Array)

Converts the operator and its operands into an object whose key is the operator value, and the value is the array of operands.

```js
const parser = new SqlWhereParser();
const evaluation = parser.defaultEvaluator('OPERATOR', [1, 2, 3]);
equals(evaluation, {
    'OPERATOR': [1, 2, 3]
});
```

...Except for the special "," operator, which acts like a binary operator, but is not really an operator. It combines anything comma-separated into an array.

```js
const parser = new SqlWhereParser();
const evaluation = parser.defaultEvaluator(',', [1, 2]);
equals(evaluation, [1, 2]);
```

When used in the recursive manner that it is, we are able to combine the results of several binary comma operations into a single array.

```js
const parser = new SqlWhereParser();
const evaluation = parser.defaultEvaluator(',', [[1, 2], 3]);
equals(evaluation, [1, 2, 3]);
```

With the unary minus Symbol, it converts it back into a regular minus string, since the operands have been determined by this point.

```js
const parser = new SqlWhereParser();
const evaluation = parser.defaultEvaluator(SqlWhereParser.OPERATOR_UNARY_MINUS, [1]);
equals(evaluation, {
    '-': [1]
});
```


#### #tokenizer:TokenizeThis

The tokenizer used on the string. See documentation [here](https://github.com/shaunpersad/tokenize-this).

```js
const parser = new SqlWhereParser();
parser.tokenizer.should.be.instanceOf(TokenizeThis);
```


#### #operators:Object

An object whose keys are the supported operator values, and whose values are instances of the Operator class.

```js
const parser = new SqlWhereParser();
const operators = ["!", SqlWhereParser.OPERATOR_UNARY_MINUS, "^","*","/","%","+","-","=","<",">","<=",">=","!=",",","NOT","BETWEEN","IN","IS","LIKE","AND","OR"];
operators.forEach((operator) => {
    parser.operators[operator].should.be.instanceOf(SqlWhereParser.Operator);
});
```


#### .defaultConfig:Object

The default config object used when no config is supplied. For the tokenizer config options, see [here](https://github.com/shaunpersad/tokenize-this#defaultconfigobject).

```js
const OPERATOR_TYPE_UNARY = 1;
const OPERATOR_TYPE_BINARY = 2;
const OPERATOR_TYPE_TERNARY = 3;
const unaryMinusDefinition = {
    [SqlWhereParser.OPERATOR_UNARY_MINUS]: OPERATOR_TYPE_UNARY
};
equals(SqlWhereParser.defaultConfig, {
    operators: [
        {
            '!': OPERATOR_TYPE_UNARY
        },
        unaryMinusDefinition,
        {
            '^': OPERATOR_TYPE_BINARY
        },
        {
            '*': OPERATOR_TYPE_BINARY,
            '/': OPERATOR_TYPE_BINARY,
            '%': OPERATOR_TYPE_BINARY
        },
        {
            '+': OPERATOR_TYPE_BINARY,
            '-': OPERATOR_TYPE_BINARY
        },
        {
            '=': OPERATOR_TYPE_BINARY,
            '<': OPERATOR_TYPE_BINARY,
            '>': OPERATOR_TYPE_BINARY,
            '<=': OPERATOR_TYPE_BINARY,
            '>=': OPERATOR_TYPE_BINARY,
            '!=': OPERATOR_TYPE_BINARY
        },
        {
            ',': OPERATOR_TYPE_BINARY // We treat commas as an operator, to aid in turning arbitrary numbers of comma-separated values into arrays.
        },
        {
            'NOT': OPERATOR_TYPE_UNARY
        },
        {
            'BETWEEN': OPERATOR_TYPE_TERNARY,
            'IN': OPERATOR_TYPE_BINARY,
            'IS': OPERATOR_TYPE_BINARY,
            'LIKE': OPERATOR_TYPE_BINARY
        },
        {
            'AND': OPERATOR_TYPE_BINARY
        },
        {
            'OR': OPERATOR_TYPE_BINARY
        }
    ],
    tokenizer: {
        shouldTokenize: ['(', ')', ',', '*', '/', '%', '+', '-', '=', '!=','!', '<', '>', '<=', '>=', '^'],
        shouldMatch: ['"', "'", '`'],
        shouldDelimitBy: [' ', "\n", "\r", "\t"]
    }
});
```


#### .Operator:Operator

The Operator class.

```js
const parser = new SqlWhereParser();
parser.operators['AND'].should.be.instanceOf(SqlWhereParser.Operator);
```


#### .OPERATOR_UNARY_MINUS:Symbol

The Symbol used as the unary minus operator value.

```js
(typeof SqlWhereParser.OPERATOR_UNARY_MINUS).should.equal('symbol');
```
