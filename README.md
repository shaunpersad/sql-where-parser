
# SqlWhereParser

## What is it?

SqlWhereParser parses the WHERE portion of an SQL-like string into an abstract syntax tree.

```js
const sql = 'name = "Shaun Persad" AND age >= 27';
const parser = new SqlWhereParser();
const parsed = parser.parse(sql);
/**
 * The tree is object-based, where each key is the operator, and its value is an array of the operands.
 * The number of operands depends on if the operation is defined as unary, binary, or ternary in the config.
 */
equals(parsed, {
    'AND': [
        {
            '=': ['name', 'Shaun Persad']
        },
        {
           '>=': ['age', 27] 
        }
    ]
});
```

You can also evaluate the query in-line as the expressions are being built.

```js
const sql = 'name = "Shaun Persad" AND age >= (20 + 7)';
const parser = new SqlWhereParser();
/**
 * This evaluator function will evaluate the "+" operator with its operands by adding its operands together.
 */
const parsed = parser.parse(sql, (operatorValue, operands) => {
    
    if (operatorValue === '+') {
        return operands[0] + operands[1];
    }
    return parser.defaultEvaluator(operatorValue, operands);
});

equals(parsed, {
    'AND': [
        {
            '=': ['name', 'Shaun Persad']
        },
        {
            '>=': ['age', 27]
        }
    ]
});
```

This evaluation can also be used to convert the AST into a specific tree, like a MongoDB query.

```js
const sql = 'name = "Shaun Persad" AND age >= 27';
const parser = new SqlWhereParser();
/**
 * This will map each operand to its mongoDB equivalent.
 */
const parsed = parser.parse(sql, (operatorValue, operands) => {
    switch (operatorValue) {
        case '=':
            return {
                [operands[0]]: operands[1]
            };
        case 'AND':
            return {
                $and: operands
            };
        case '>=':
            return {
                [operands[0]]: {
                    $gte: operands[1]
                }
            };
    }
});

equals(parsed, {
    $and: [
        {
            name: 'Shaun Persad'
        },
        {
            age: {
                $gte: 27
            }
        }
    ]
});
```

SqlWhereParser can also parse into an array-like structure, where each sub-array is its own group of parentheses in the SQL.

```js
const sql = '(name = "Shaun Persad") AND (age >= (20 + 7))';
const parser = new SqlWhereParser();
const sqlArray = parser.toArray(sql);
equals(sqlArray, [['name', '=', 'Shaun Persad'], 'AND', ['age', '>=', [20, '+', 7]]]);
```

This array structure is useful for displaying the query on the front-end, e.g. as HTML.

```js
const sql = '(name = "Shaun Persad") AND age >= (20 + 7)';
const parser = new SqlWhereParser();
const sqlArray = parser.toArray(sql);
/**
 * This function will recursively map the elements of the array to HTML.
 */
const toHtml = (toConvert) => {
    if (toConvert && toConvert.constructor === SqlWhereParser.Operator) {
        return `<strong class="operator">${toConvert}</strong>`;
    }
    
    if (!toConvert || !(toConvert.constructor === Array)) {
        
        return `<span class="operand">${toConvert}</span>`;
    }
    const html = toConvert.map((toConvert) => {
        return toHtml(toConvert);
    });
    return `<div class="expression">${html.join('')}</div>`;
};

const html = toHtml(sqlArray);
equals(html,
    '<div class="expression">' +
        '<div class="expression">' +
            '<span class="operand">name</span>' +
            '<strong class="operator">=</strong>' +
            '<span class="operand">Shaun Persad</span>' +
        '</div>' +
        '<strong class="operator">AND</strong>' +
        '<span class="operand">age</span>' +
        '<strong class="operator">>=</strong>' +
        '<div class="expression">' +
            '<span class="operand">20</span>' +
            '<strong class="operator">+</strong>' +
            '<span class="operand">7</span>' +
        '</div>' +
    '</div>'
);
```

## Installation

`npm install sql-where-parser`.

```js
// or if in the browser: <script src="sql-where-parser/sql-where-parser.min.js"></script>
```

## Usage

`require` it, and create a new instance.

```js
//const SqlWhereParser = require('sql-where-parser');
const sql = 'name = "Shaun Persad" AND age >= 27';
const parser = new SqlWhereParser();

const parsed = parser.parse(sql);
const sqlArray = parser.toArray(sql);
```


## Advanced Usage

### Supplying a config object to the constructor is also possible (see [here](#defaultconfigobject) for all options)

This can be used to create new operators.

```js
const config = SqlWhereParser.defaultConfig; // start off with the default config.

config.operators[5]['<=>'] = 2; // number of operands to expect for this operator.
config.operators[5]['<>'] = 2; // number of operands to expect for this operator.
config.tokenizer.shouldTokenize.push('<=>', '<>');
const sql = 'name <> "Shaun Persad" AND age <=> 27';
const parser = new SqlWhereParser(config); // use the new config
const parsed = parser.parse(sql);
equals(parsed, {
    'AND': [
        {
            '<>': ['name', 'Shaun Persad']
        },
        {
            '<=>': ['age', 27]
        }
    ]
});
```

## API

### #parse(sql:String):Object

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
                                    'IN': ['location', ['NY', 'America']
                                    ]
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
            '=': ['name', 'Shaun Persad']
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

### #parse(sql:String, evaluator(operatorValue:String|Symbol, operands:Array):Function):*

Uses the supplied evaluator function to convert an operator and its operands into its evaluation. The default evaluator actually does no "evaluation" in the mathematical sense. Instead it creates an object whose key is the operator, and the value is an array of the operands.

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

### #toArray(sql:String):Array

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

### #operatorPrecedenceFromValues(operatorValue1:String|Symbol, operatorValue2:String|Symbol):Boolean

Determines if operator 2 is of a higher precedence than operator 1.

```js
const parser = new SqlWhereParser();
                
parser.operatorPrecedenceFromValues('AND', 'OR').should.equal(false); // AND is higher than OR

parser.operatorPrecedenceFromValues('+', '-').should.equal(true); // + and - are equal
parser.operatorPrecedenceFromValues('+', '*').should.equal(true); // * is higher than +
/**
 * For full precedence list, check the [defaultConfig](#defaultconfigobject) object.
 */
```

It also works if either of the operator values are a Symbol instead of a String.

```js
const parser = new SqlWhereParser();
parser.operatorPrecedenceFromValues(SqlWhereParser.OPERATOR_UNARY_MINUS, '-').should.equal(false); // unary minus is higher than minus
```

### #getOperator(operatorValue:String|Symbol):Operator

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

### #defaultEvaluator(operatorValue:String|Symbol, operands:Array)

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

When used in the recursive manner that it is, we are able to combine the results of several binary "," operations into a single array.

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

### #tokenizer:TokenizeThis

The tokenizer used on the string. See documentation [here](https://github.com/shaunpersad/tokenize-this).

```js
const parser = new SqlWhereParser();
parser.tokenizer.should.be.instanceOf(TokenizeThis);
```

### #operators:Object

An object whose keys are the supported operator values, and whose values are instances of the Operator class.

```js
const parser = new SqlWhereParser();
const operators = ["!", SqlWhereParser.OPERATOR_UNARY_MINUS, "^","*","/","%","+","-","=","<",">","<=",">=","!=",",","NOT","BETWEEN","IN","IS","LIKE","AND","OR"];

operators.forEach((operator) => {
   
    parser.operators[operator].should.be.instanceOf(SqlWhereParser.Operator);
});
```

### .defaultConfig:Object

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

### .Operator:Operator

The Operator class.

```js
const parser = new SqlWhereParser();
parser.operators['AND'].should.be.instanceOf(SqlWhereParser.Operator);
```

### .OPERATOR_UNARY_MINUS:Symbol

The Symbol used as the unary minus operator value.

```js
(typeof SqlWhereParser.OPERATOR_UNARY_MINUS).should.equal('symbol');
```