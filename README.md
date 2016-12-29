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

const parsed = parser.parse(sql); // Abstract syntax tree
const sqlArray = parser.toArray(sql); // Array
```


## Advanced Usage
### Supplying a config object

#### see [here](https://github.com/shaunpersad/sql-where-parser/blob/master/API.md#defaultconfigobject) for all options

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
For the full API documentation and more examples, see [here](https://github.com/shaunpersad/sql-where-parser/blob/master/API.md).