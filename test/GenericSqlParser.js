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

        it('should return a results object with logicalArray, displayArray, and syntaxTree properties.', function() {

            const parsed = parser.parse('');
            parsed.should.have.property('logicalArray').which.is.an.Array;
            parsed.should.have.property('displayArray').which.is.an.Array;
            parsed.should.have.property('syntaxTree').which.is.an.Object;
        });

        describe('results.logicalArray', function() {

            it('should return the parsed SQL as an array.', function() {

                const parsed = parser.parse('name = shaun');
                
                equals(parsed.logicalArray, ['name', '=', 'shaun']);
            });

            it('should not care about spaces.', function() {

                const parsed = parser.parse('  name  =  shaun     ');
                
                equals(parsed.logicalArray, ['name', '=', 'shaun']);
            });

            it('should strip out unnecessary parentheses.', function() {

                const parsed = parser.parse('(((name) = ((shaun))))');

                equals(parsed.logicalArray, ['name', '=', 'shaun']);
            });

            it('should add explicit groupings defined by the order of operations.', function() {

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

                equals(parsed.logicalArray, [
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

        describe('results.displayArray', function() {
        
        
            it('should return the parsed SQL as an array.', function() {
        
                const parsed = parser.parse('name = shaun');

                equals(parsed.displayArray, ['name', '=', 'shaun']);
            });
        
            it('should not care about spaces.', function() {
        
                const parsed = parser.parse('  name  =  shaun     ');

                equals(parsed.displayArray, ['name', '=', 'shaun']);
            });
        
            it('should strip out unnecessary parentheses.', function() {
        
                const parsed = parser.parse('(((name) = ((shaun))))');

                equals(parsed.displayArray, ['name', '=', 'shaun']);
            });
        
            it('should keep the original groupings.', function() {
        
                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                equals(parsed.displayArray, [
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
        
            it('should keep the original groupings but still strip out unnecessary parentheses.', function() {
        
                const parsed = parser.parse('(name = shaun AND job = developer AND ((gender = male OR type = person AND location IN (NY, America) AND hobby = coding)))');

                equals(parsed.displayArray, [
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
        
        describe('results.syntaxTree', function() {
        
            it('should use the results.logicalArray to build a tree object.', function() {
           
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


                equals(parsed.syntaxTree, {
                    "AND": [
                        {
                            "AND": [
                                {
                                    "=": [
                                        "name",
                                        "shaun"
                                    ]
                                },
                                {
                                    "=": [
                                        "job",
                                        "developer"
                                    ]
                                }
                            ]
                        },
                        {
                            "OR": [
                                {
                                    "=": [
                                        "gender",
                                        "male"
                                    ]
                                },
                                {
                                    "AND": [
                                        {
                                            "AND": [
                                                {
                                                    "=": [
                                                        "type",
                                                        "person"
                                                    ]
                                                },
                                                {
                                                    "IN": [
                                                        "location",
                                                        [
                                                            "NY",
                                                            "America"
                                                        ]
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            "=": [
                                                "hobby",
                                                "coding"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });

            });
        });
       
    });
    
    describe('#logicalArrayToSyntaxTree(Array:logicalArray):Object', function() {
       
        it('should return an object representation of the supplied logicalArray.', function() {
    
            const syntaxTree = parser.logicalArrayToSyntaxTree([]);
            syntaxTree.should.be.an.Object;
        });
    });
    
    describe('#setPrecedence(Array:tokens):Array', function() {
    
        it('should take an array of tokens and group them explicitly, based on the order of operations.', function() {
    
            const orderedTokens = parser.setPrecedence(['a1', '=', 'a2', 'OR', 'b', 'AND', 'c', 'OR', 'd', 'LIKE', 'e', 'AND', 'f', '<', 'g']);
            
            equals(orderedTokens, [[["a1","=","a2"],"OR",["b","AND","c"]],"OR",[["d","LIKE","e"],"AND",["f","<","g"]]]);
        });
    });
});
