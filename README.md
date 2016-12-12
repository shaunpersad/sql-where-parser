# sql-where-parser
Parses an SQL-like WHERE string into various forms.

Basically, converts this:
`name = "Shaun Persad" AND occupation = developer OR (hobby IN ("programming", "nerd stuff") OR 'hobby' IS NOT NULL)`

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
        return <span class="token">tokens</span>;
    }
    
    var html = tokens.map((token) => {
       
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