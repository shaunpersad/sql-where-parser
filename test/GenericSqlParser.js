"use strict";

const should = require('should');
const GenericSqlParser = require('../GenericSqlParser');
const parser = new GenericSqlParser();

function equals(obj1, obj2) {
    
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        throw new Error('The two objects are not the same.');
    }
}

describe('GenericSqlParser', function() {

    describe('#parse(String: sql):Object', function() {

        it('returns a results object with tokens, expression, expressionDisplay, and expressionTree properties.', function() {

            const parsed = parser.parse('');
            parsed.should.have.property('tokens').which.is.an.Array;
            parsed.should.have.property('expression').which.is.an.Array;
            parsed.should.have.property('expressionDisplay').which.is.an.Array;
            parsed.should.have.property('expressionTree').which.is.an.Array;

        });

        describe('results.tokens', function() {
           
            it('is an array containing the tokens of the SQL string (wrapped in parentheses).', function() {
                
                const results = parser.parse('name = shaun');
                results.tokens.should.be.an.Array;
                equals(results.tokens, ['(', 'name', '=', 'shaun', ')']);
            });
            
            it('treats anything wrapped in single-quotes, double-quotes, and ticks as a single token', function() {

                const results = parser.parse(`(name = shaun) and "a" = 'b(' or (\`c\` OR "d e, f")`);
                results.tokens.should.be.an.Array;
                equals(results.tokens, ['(', '(', 'name', '=', 'shaun', ')', 'and', 'a', '=', 'b(', 'or', '(', 'c', 'OR', 'd e, f', ')', ')']);
            });
        });
        
        describe('results.expression', function() {

            it('is the parsed SQL as an array.', function() {

                const parsed = parser.parse('name = shaun');
                
                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('does not care about spaces.', function() {

                const parsed = parser.parse('  name  =  shaun     ');
                
                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('strips out unnecessary parentheses.', function() {

                const parsed = parser.parse('(((name) = ((shaun))))');

                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('adds explicit groupings defined by the order of operations.', function() {

                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                /**
                 * Original.
                 */
                'name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                /**
                 * Perform equals.
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
                /**
                 * Perform IN
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
                /**
                 * Perform AND
                 */
                '(((name = shaun) AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';

                equals(parsed.expression, [
                    [
                        [
                            "name",
                            "=",
                            "shaun"
                        ],
                        "AND",
                        [
                            "job",
                            "=",
                            "developer"
                        ]
                    ],
                    "AND",
                    [
                        [
                            "gender",
                            "=",
                            "male"
                        ],
                        "OR",
                        [
                            [
                                [
                                    "type",
                                    "=",
                                    "person"
                                ],
                                "AND",
                                [
                                    "location",
                                    "IN",
                                    [
                                        "NY",
                                        "America"
                                    ]
                                ]
                            ],
                            "AND",
                            [
                                "hobby",
                                "=",
                                "coding"
                            ]
                        ]
                    ]
                ]);
            });
        });

        describe('results.expressionDisplay', function() {
            
            it('keeps the original groupings but still strips out unnecessary parentheses.', function() {
        
                const parsed = parser.parse('(name = shaun AND job = developer AND ((gender = male OR type = person AND location IN (NY, America) AND hobby = coding)))');

                equals(parsed.expressionDisplay, [
                    "name",
                    "=",
                    "shaun",
                    "AND",
                    "job",
                    "=",
                    "developer",
                    "AND",
                    [
                        "gender",
                        "=",
                        "male",
                        "OR",
                        "type",
                        "=",
                        "person",
                        "AND",
                        "location",
                        "IN",
                        [
                            "NY",
                            "America"
                        ],
                        "AND",
                        "hobby",
                        "=",
                        "coding"
                    ]
                ]);
            });
        });
        
        describe('results.expressionTree', function() {
        
            it('converts the expression into a tree.', function() {
           
                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                /**
                 * Original.
                 */
                'name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                /**
                 * Perform equals.
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
                /**
                 * Perform IN
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
                /**
                 * Perform AND
                 */
                '(((name = shaun) AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';
                
                equals(parsed.expressionTree, [
                    'AND',
                    [
                        [
                            'AND',
                            [
                                [
                                    '=',
                                    [
                                        'name',
                                        'shaun'
                                    ]
                                ],
                                [
                                    '=',
                                    [
                                        'job',
                                        'developer'
                                    ]
                                ]
                            ]
                        ],
                        [
                            'OR',
                            [
                                [
                                    '=',
                                    [
                                        'gender',
                                        'male'
                                    ]
                                ],
                                [
                                    'AND',
                                    [
                                        [
                                            'AND',
                                            [
                                                [
                                                    '=',
                                                    [
                                                        'type',
                                                        'person'
                                                    ]
                                                ],
                                                [
                                                    'IN',
                                                    [
                                                        'location',
                                                        [
                                                            'NY',
                                                            'America'
                                                        ]
                                                    ]
                                                ]
                                            ]
                                        ],
                                        [
                                            '=',
                                            [
                                                'hobby',
                                                'coding'
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]);
            });
        });
    });
    
    describe('#expressionTreeFromExpression(Array|*: expression):Array', function() {
       
        it('returns a tree representation of the supplied expression array.', function() {
    
            const syntaxTree = parser.expressionTreeFromExpression([]);
            syntaxTree.should.be.an.Array;
        });
    });
    
    describe('#setPrecedenceInExpression(Array|*: expression):Array', function() {
    
        it('takes an array of tokens and groups them explicitly, based on the order of operations.', function() {
    
            const orderedTokens = parser.setPrecedenceInExpression(['a1', '=', 'a2', 'OR', 'b', 'AND', 'c', 'OR', 'd', 'LIKE', 'e', 'AND', 'f', '<', 'g']);
            
            equals(orderedTokens, [[["a1","=","a2"],"OR",["b","AND","c"]],"OR",[["d","LIKE","e"],"AND",["f","<","g"]]]);
        });
    });
    
    describe('#operatorType(String: operator):Function|null', function() {

        it("returns the operator's type (unary, binary, etc.).", function() {

            parser.operators.forEach((operators) => {

                Object.keys(operators).forEach((operator) => {

                    const type = operators[operator];
                    parser.operatorType(operator).should.equal(type);
                    parser.operatorType(operator).should.be.a.Function;
                });
            });
        });
    });
    
    describe('.tokenize(String: sql, Function: iteratee):Array', function() {
        
    });
    
    describe('.reduceArray(Array: arr):Array', function() {
        
    });
    
    describe('.OPERATOR_TYPE_UNARY', function() {
        
    });

    describe('.OPERATOR_TYPE_BINARY', function() {

    });

    describe('.OPERATOR_TYPE_BINARY_IN', function() {

    });
    
    describe('.OPERATOR_TYPE_TERNARY_BETWEEN', function() {

    });
    
    describe('.LiteralIndex', function() {
        
    });
});
