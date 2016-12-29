"use strict";

const should = require('should');
const SqlWhereParser = require('../SqlWhereParser');

function equals(obj1, obj2) {

    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        throw new Error('The two objects are not the same.');
    }
}

describe('SqlWhereParser', function() {
    
    
    describe('What is it?', function() {

        it('SqlWhereParser parses the WHERE portion of an SQL-like string into an abstract syntax tree', function() {
            
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
                        '=': [
                            'name',
                            'Shaun Persad'
                        ]
                    },
                    {
                       '>=': [
                           'age',
                           27
                       ] 
                    }
                ]
            });
        });
        
        it('You can also evaluate the query in-line as the expressions are being built', function() {

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
                        '=': [
                            'name',
                            'Shaun Persad'
                        ]
                    },
                    {
                        '>=': [
                            'age',
                            27
                        ]
                    }
                ]
            });
        });
        
        it('This evaluation can also be used to convert the AST into a specific tree, like a MongoDB query', function() {

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
        });

        it('SqlWhereParser can also parse into an array-like structure, where each sub-array is its own group of parentheses in the SQL', function() {

            const sql = '(name = "Shaun Persad") AND age >= (20 + 7)';
            const parser = new SqlWhereParser();
            
            const sqlArray = parser.toArray(sql);
            
            equals(sqlArray, [
                ['name', '=', 'Shaun Persad'],
                'AND',
                'age', 
                '>=',
                [20, '+', 7]
            ]);
        });
        
        it('This array structure is useful for displaying the query on the front-end, e.g. as HTML', function() {

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
        });
    });
    
    describe('Installation', function() {

        it('`npm install sql-where-parser`', function() {
            // or if in the browser: <script src="sql-where-parser/sql-where-parser.min.js"></script>
        });
    });
    
    describe('Usage', function() {
       
        it('`require` it, and create a new instance', function() {

            //const SqlWhereParser = require('sql-where-parser');
            const sql = 'name = "Shaun Persad" AND age >= 27';
            const parser = new SqlWhereParser();
            
            const parsed = parser.parse(sql);
            const sqlArray = parser.toArray(sql);
        });
    });

    describe('Advanced Usage', function() {

        describe('Supplying a config object to the constructor is also possible (see [here](#defaultconfigobject) for all options)', function() {
            
            it('This can be used to create new operators', function() {
                
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
                            '<>': [
                                'name',
                                'Shaun Persad'
                            ]
                        },
                        {
                            '<=>': [
                                'age',
                                27
                            ]
                        }
                    ]
                });
            });
        });
    });
    
    describe('API', function() {

        describe('#parse(sql:String):Object', function() {
           
            it('Parses the SQL string into an AST with the proper order of operations', function() {

                const sql = 'name = "Shaun Persad" AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                const parser = new SqlWhereParser();
                const parsed = parser.parse(sql);
                
                /**
                 * Original.
                 */
                'name = "Shaun Persad" AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                /**
                 * Perform equals.
                 */
                '(name = "Shaun Persad") AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
                /**
                 * Perform IN
                 */
                '(name = "Shaun Persad") AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
                /**
                 * Perform AND
                 */
                '(((name = "Shaun Persad") AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';

                equals(parsed, {
                    'AND': [
                        {
                            'AND': [
                                {
                                    '=': [
                                        'name',
                                        'Shaun Persad'
                                    ]
                                },
                                {
                                    '=': [
                                        'job',
                                        'developer'
                                    ]
                                }
                            ]
                        },
                        {
                            'OR': [
                                {
                                    '=': [
                                        'gender',
                                        'male'
                                    ]
                                },
                                {
                                    'AND': [
                                        {
                                            'AND': [
                                                {
                                                    '=': [
                                                        'type',
                                                        'person'
                                                    ]
                                                },
                                                {
                                                    'IN': [
                                                        'location',
                                                        [
                                                            'NY',
                                                            'America'
                                                        ]
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            '=': [
                                                'hobby',
                                                'coding'
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            });
            
            it('It handles the unary minus case appropriately', function() {

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
            });
            
            it('Handles the BETWEEN case appropriately', function() {

                const parser = new SqlWhereParser();
                let parsed = parser.parse('A BETWEEN 5 AND 10 AND B = C');

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
            });
            
            it('Unnecessarily nested parentheses do not matter', function() {

                const sql = '((((name = "Shaun Persad")) AND (age >= 27)))';
                const parser = new SqlWhereParser();
                const parsed = parser.parse(sql);
                
                equals(parsed, {
                    'AND': [
                        {
                            '=': [
                                'name',
                                'Shaun Persad'
                            ]
                        },
                        {
                            '>=': [
                                'age',
                                27
                            ]
                        }
                    ]
                });
            });
            
            it('Throws a SyntaxError if the supplied parentheses do not match', function() {

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
            });
        });
        
        describe('#parse(sql:String, evaluator(operatorValue:String|Symbol, operands:Array):Function):*', function() {
            
            it('Uses the supplied evaluator function to convert an operator and its operands into its evaluation');
            it('"Evaluation" is subjective, and this can be exploited to convert the default object-based structure of the AST into something else, like this array-based structure');
            it('...Or HTML');
        });
        
        describe('#toArray(sql:String):Array', function() {
           
            it('Parses the SQL string into a nested array, where each expression is its own array');
            it('This array structure can then be mapped into other things, like HTML for the front-end');
        });
        
        describe('#operatorPrecedenceFromValues(operatorValue1:String|Symbol, operatorValue2:String|Symbol):Boolean', function() {
           
            it('Determines if operator 1 is of a higher precedence than operator 2');
            it('It also works if either of the operator values are a Symbol instead of a String');
        });
        
        describe('#getOperator(operatorValue:String|Symbol):Operator', function() {
           
            it('Returns the corresponding instance of the Operator class');
            it('It also works if the operator value is a Symbol instead of a String');
        });

        describe('#defaultEvaluator(operatorValue:String|Symbol, operands:Array)', function() {

            it('Converts the operator and its operands into an object whose key is the operator value, and the value is the array of operands');
            it('...Except for the special "," operator, which is not really an operator. It combines anything comma-separated into an array');
            it('Also for the unary minus Symbol, it converts it back into a regular minus string, since the operands have been determined by this point');
        });

        describe('#tokenizer:TokenizeThis', function() {

            it('The tokenizer used on the string. See documentation [here](https://github.com/shaunpersad/tokenize-this)');
        });

        describe('#operators:Object', function() {

            it('An object whose keys are the supported operator values, and whose values are instances of the Operator class');
        });
        
        describe('.defaultConfig:Object', function() {
           
            it('The default config object used when no config is supplied. For the tokenizer config options, see [here](https://github.com/shaunpersad/tokenize-this#defaultconfigobject)');
        });

        describe('.Operator:Operator', function() {

            it('The Operator class');
        });

        describe('.OPERATOR_UNARY_MINUS:Symbol', function() {

            it('The Symbol used as the unary minus operator value');
        });
    });
});
