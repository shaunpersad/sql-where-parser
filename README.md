# sql-where-parser
Parses an SQL-like WHERE string into various forms.

Basically, converts this:
`name = "Shaun Persad" AND occupation = developer OR (hobby IN ("programming", "nerd stuff") OR hobby IS NOT NULL)`

To this:
```
{
  "logicalArray": [
    [
      [
        "name",
        "=",
        "Shaun Persad"
      ],
      "AND",
      [
        "occupation",
        "=",
        "developer"
      ]
    ],
    "OR",
    [
      [
        "hobby",
        "IN",
        [
          "programming",
          "nerd stuff"
        ]
      ],
      "OR",
      [
        "hobby",
        "IS",
        [
          "NOT",
          "NULL"
        ]
      ]
    ]
  ],
  ...
}
```

And this:
```
{
  ...
  "displayArray": [
    "name",
    "=",
    "Shaun Persad",
    "AND",
    "occupation",
    "=",
    "developer",
    "OR",
    [
      "hobby",
      "IN",
      [
        "programming",
        "nerd stuff"
      ],
      "OR",
      "hobby",
      "IS",
      "NOT",
      "NULL"
    ]
  ],
  ...
}
```

And also, this:
```
{
   ...
  "syntaxTree": {
    "OR": [
      {
        "AND": [
          {
            "=": [
              "name",
              "Shaun Persad"
            ]
          },
          {
            "=": [
              "occupation",
              "developer"
            ]
          }
        ]
      },
      {
        "OR": [
          {
            "IN": [
              "hobby",
              [
                "programming",
                "nerd stuff"
              ]
            ]
          },
          {
            "IS": [
              "hobby",
              {
                "NOT": "NULL"
              }
            ]
          }
        ]
      }
    ]
  }
}
```


## Usage
```
const GenericSqlParser = require('generic-sql-parser'); // or require('generic-sql-parser/browser')
const sql = 'name = "Shaun Persad" AND occupation = developer OR (hobby IN ("programming", "nerd stuff") OR "hobby" IS NOT NULL)';
const parser = new GenericSqlParser();

const result = parser.parse(sql); // result now contains logicalArray, displayArray, and syntaxTree properties.
```

### logicalArray
This array is useful for determining the explicit order of operations, as all operations are wrapped unambiguously.

### displayArray
This array is useful for mapping to HTML or some other front-end, since it uses the minimal amount of wrapped operations.

e.g.
```
function mapTokens(tokens) {
    
    if (tokens.constructor !== Array) {
        return `<span class="token">${tokens}</span>`;
    }
    
    const html = tokens.map((token) => {
       
        if (parser.operatorType(token)) {
            return `<div class="operator">${mapTokens(token)}</div>`;
        }
        return `<div class="expression">${mapTokens(token)}</div>`;
    });
    
    return `<div class="operation"><span>(</span>${html.join('')}<span>)</span></div>`;
}

const GenericSqlParser = require('generic-sql-parser');
const sql = 'name = "Shaun Persad" AND occupation = developer OR (hobby IN ("programming", "nerd stuff") OR "hobby" IS NOT NULL)';
const parser = new GenericSqlParser();

const result = parser.parse(sql); // result now contains logicalArray, displayArray, and syntaxTree properties.

const html = mapTokens(result.displayArray); //html is now a string of html. 
```

### syntaxTree
An abstract syntax tree that describes the operations. Useful for converting to other languages.

Example of converting SQL to Mongo:
```
const mongo = {
    ...
    '=': (operand1, operand2) => {

        return {
            [operand1]: {
                $eq: convertToMongo(operand2)
            }
        };
    },
    'NOT': (operand1) => {

        return {
            $not: convertToMongo(operand1)
        };
    },
    'IN': (operand1, operand2) => {

        return {
            [operand1]: {
                $in: operand2
            }
        };
    },
    'AND': (operand1, operand2) => {
        return {
            $and: [
                convertToMongo(operand1),
                convertToMongo(operand2)
            ]
        };
    },
    'OR': (operand1, operand2) => {

        return {
            $or: [
                convertToMongo(operand1),
                convertToMongo(operand2)
            ]
        };
    }
};

function convertToMongo(syntaxTree) {
    
    if (syntaxTree === 'NULL') {
        return null;
    }
    
    if (!syntaxTree || typeof syntaxTree === 'string' || syntaxTree instanceof String) {
        return syntaxTree;
    }

    let converted = {};
    const operators = Object.keys(syntaxTree);
    operators.forEach((operator) => {

        let operands = syntaxTree[operator];

        if (operands.constructor !== Array) {
            operands = [operands];
        }
        if (mongo[operator]) {
            converted = mongo[operator].apply(null, operands);
        }
    });
    
    return converted;
}

const sql = 'name = "Shaun Persad" AND occupation = developer OR (hobby IN ("programming", "nerd stuff") OR "hobby" IS NOT NULL)';
const results = parser.parse(sql);

const mongoQuery = convertToMongo(results.syntaxTree);

```