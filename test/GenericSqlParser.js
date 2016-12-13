"use strict";

const should = require('should');
const GenericSqlParser = require('../GenericSqlParser');
const parser = new GenericSqlParser();

describe('GenericSqlParser', function() {

    describe('#parse(sql)', function() {

        it('should return a results object with logicalArray, displayArray, and syntaxTree properties.', function() {

            const parsed = parser.parse('');
            parsed.should.have.property('logicalArray').which.is.an.Array;
            parsed.should.have.property('displayArray').which.is.an.Array;
            parsed.should.have.property('syntaxTree').which.is.an.Object;
        });

        describe('results.logicalArray', function() {

            it('should return the parsed SQL as an array.', function() {

                const parsed = parser.parse('name = shaun');
                parsed.logicalArray.should.be.an.Array;
                parsed.logicalArray.should.have.length(3);
                parsed.logicalArray[0].should.equal('name');
                parsed.logicalArray[1].should.equal('=');
                parsed.logicalArray[2].should.equal('shaun');
            });

            it('should not care about spaces.', function() {

                const parsed = parser.parse('  name  =  shaun     ');
                parsed.logicalArray.should.be.an.Array;
                parsed.logicalArray.should.have.length(3);
                parsed.logicalArray[0].should.equal('name');
                parsed.logicalArray[1].should.equal('=');
                parsed.logicalArray[2].should.equal('shaun');
            });

            it('should strip out unnecessary parentheses.', function() {

                const parsed = parser.parse('(((name) = ((shaun))))');
                parsed.logicalArray.should.be.an.Array;
                parsed.logicalArray.should.have.length(3);
                parsed.logicalArray[0].should.equal('name');
                parsed.logicalArray[1].should.equal('=');
                parsed.logicalArray[2].should.equal('shaun');
            });

            it('should add explicit groupings defined by the order of operations.', function() {

                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                const tests = {
                    'name = shaun AND job = developer': [
                        parsed.logicalArray[0].should.be.an.Array,
                        parsed.logicalArray[0].should.have.length(3)
                    ],
                    'name = shaun': [
                        parsed.logicalArray[0][0].should.be.an.Array,
                        parsed.logicalArray[0][0].should.have.length(3)
                    ],
                    'name': parsed.logicalArray[0][0][0].should.equal('name'),
                    'name =': parsed.logicalArray[0][0][1].should.equal('='),
                    'shaun': parsed.logicalArray[0][0][2].should.equal('shaun'),
                    'name = shaun AND': parsed.logicalArray[0][1].should.equal('AND'),
                    'job = developer': [
                        parsed.logicalArray[0][2].should.be.an.Array,
                        parsed.logicalArray[0][2].should.have.length(3)
                    ],
                    'job': parsed.logicalArray[0][2][0].should.equal('job'),
                    'job =': parsed.logicalArray[0][2][1].should.equal('='),
                    'developer': parsed.logicalArray[0][2][2].should.equal('developer'),
                    'name = shaun AND job = developer AND': parsed.logicalArray[1].should.equal('AND'),
                    '(gender = male OR type = person AND location IN (NY, America) AND hobby = coding)': [
                        parsed.logicalArray[2].should.be.an.Array,
                        parsed.logicalArray[2].should.have.length(3)
                    ],
                    '(gender = male OR type = person AND location IN (NY, America)': [
                        parsed.logicalArray[2][0].should.be.an.Array,
                        parsed.logicalArray[2][0].should.have.length(3)
                    ],
                    'gender = male OR type = person': [
                        parsed.logicalArray[2][0][0].should.be.an.Array,
                        parsed.logicalArray[2][0][0].should.have.length(3)
                    ],
                    'gender = male': [
                        parsed.logicalArray[2][0][0][0].should.be.an.Array,
                        parsed.logicalArray[2][0][0][0].should.have.length(3)
                    ],
                    'gender': parsed.logicalArray[2][0][0][0][0].should.equal('gender'),
                    'gender = ': parsed.logicalArray[2][0][0][0][1].should.equal('='),
                    'male': parsed.logicalArray[2][0][0][0][2].should.equal('male'),
                    'gender = male OR': parsed.logicalArray[2][0][0][1].should.equal('OR'),
                    'type = person': [
                        parsed.logicalArray[2][0][0][2].should.be.an.Array,
                        parsed.logicalArray[2][0][0][2].should.have.length(3)
                    ],
                    'type': parsed.logicalArray[2][0][0][2][0].should.equal('type'),
                    'type =': parsed.logicalArray[2][0][0][2][1].should.equal('='),
                    'person': parsed.logicalArray[2][0][0][2][2].should.equal('person'),
                    '(gender = male OR type = person AND': parsed.logicalArray[2][0][1].should.equal('AND'),
                    'location IN (NY, America)': [
                        parsed.logicalArray[2][0][2].should.be.an.Array,
                        parsed.logicalArray[2][0][2].should.have.length(3)
                    ],
                    'location': parsed.logicalArray[2][0][2][0].should.equal('location'),
                    'location IN': parsed.logicalArray[2][0][2][1].should.equal('IN'),
                    '(NY, America)': [
                        parsed.logicalArray[2][0][2][2].should.be.an.Array,
                        parsed.logicalArray[2][0][2][2].should.have.length(2)
                    ],
                    'NY': parsed.logicalArray[2][0][2][2][0].should.equal('NY'),
                    'America': parsed.logicalArray[2][0][2][2][1].should.equal('America'),
                    '(gender = male OR type = person AND location IN (NY, America) AND': parsed.logicalArray[2][1].should.equal('AND'),
                    'hobby = coding': [
                        parsed.logicalArray[2][2].should.be.an.Array,
                        parsed.logicalArray[2][2].should.have.length(3)
                    ],
                    'hobby': parsed.logicalArray[2][2][0].should.equal('hobby'),
                    'hobby =': parsed.logicalArray[2][2][1].should.equal('='),
                    'coding': parsed.logicalArray[2][2][2].should.equal('coding')
                };
            });


        });

        describe('results.displayArray', function() {


            it('should return the parsed SQL as an array.', function() {

                const parsed = parser.parse('name = shaun');
                parsed.displayArray.should.be.an.Array;
                parsed.displayArray.should.have.length(3);
                parsed.displayArray[0].should.equal('name');
                parsed.displayArray[1].should.equal('=');
                parsed.displayArray[2].should.equal('shaun');
            });

            it('should not care about spaces.', function() {

                const parsed = parser.parse('  name  =  shaun     ');
                parsed.displayArray.should.be.an.Array;
                parsed.displayArray.should.have.length(3);
                parsed.displayArray[0].should.equal('name');
                parsed.displayArray[1].should.equal('=');
                parsed.displayArray[2].should.equal('shaun');
            });

            it('should strip out unnecessary parentheses.', function() {

                const parsed = parser.parse('(((name) = ((shaun))))');
                parsed.displayArray.should.be.an.Array;
                parsed.displayArray.should.have.length(3);
                parsed.displayArray[0].should.equal('name');
                parsed.displayArray[1].should.equal('=');
                parsed.displayArray[2].should.equal('shaun');
            });

            it('should keep the original groupings.', function() {

                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                const tests = {
                    'name': parsed.displayArray[0].should.equal('name'),
                    'name =': parsed.displayArray[1].should.equal('='),
                    'shaun': parsed.displayArray[2].should.equal('shaun'),
                    'shaun AND': parsed.displayArray[3].should.equal('AND'),
                    'job': parsed.displayArray[4].should.equal('job'),
                    'job =': parsed.displayArray[5].should.equal('='),
                    'developer': parsed.displayArray[6].should.equal('developer'),
                    'developer AND': parsed.displayArray[7].should.equal('AND'),
                    '(gender = male OR type = person AND location IN (NY, America) AND hobby = coding)': [
                        parsed.displayArray[8].should.be.an.Array,
                        parsed.displayArray[8].should.have.length(15)
                    ],
                    'gender': parsed.displayArray[8][0].should.equal('gender'),
                    'gender =': parsed.displayArray[8][1].should.equal('='),
                    'male': parsed.displayArray[8][2].should.equal('male'),
                    'male OR': parsed.displayArray[8][3].should.equal('OR'),
                    'type': parsed.displayArray[8][4].should.equal('type'),
                    'type =': parsed.displayArray[8][5].should.equal('='),
                    'person': parsed.displayArray[8][6].should.equal('person'),
                    'person AND': parsed.displayArray[8][7].should.equal('AND'),
                    'location': parsed.displayArray[8][8].should.equal('location'),
                    'location IN': parsed.displayArray[8][9].should.equal('IN'),
                    '(NY, America)': [
                        parsed.displayArray[8][10].should.be.an.Array,
                        parsed.displayArray[8][10].should.have.length(2),
                        parsed.displayArray[8][10][0].should.equal('NY'),
                        parsed.displayArray[8][10][1].should.equal('America')
                    ],
                    '(NY, America) AND': parsed.displayArray[8][11].should.equal('AND'),
                    'hobby': parsed.displayArray[8][12].should.equal('hobby'),
                    'hobby = ': parsed.displayArray[8][13].should.equal('='),
                    'coding': parsed.displayArray[8][14].should.equal('coding')
                };
            });

            it('should keep the original groupings but still strip out unnecessary parentheses.', function() {

                const parsed = parser.parse('(name = shaun AND job = developer AND ((gender = male OR type = person AND location IN (NY, America) AND hobby = coding)))');

                const tests = {
                    'name': parsed.displayArray[0].should.equal('name'),
                    'name =': parsed.displayArray[1].should.equal('='),
                    'shaun': parsed.displayArray[2].should.equal('shaun'),
                    'shaun AND': parsed.displayArray[3].should.equal('AND'),
                    'job': parsed.displayArray[4].should.equal('job'),
                    'job =': parsed.displayArray[5].should.equal('='),
                    'developer': parsed.displayArray[6].should.equal('developer'),
                    'developer AND': parsed.displayArray[7].should.equal('AND'),
                    '(gender = male OR type = person AND location IN (NY, America) AND hobby = coding)': [
                        parsed.displayArray[8].should.be.an.Array,
                        parsed.displayArray[8].should.have.length(15)
                    ],
                    'gender': parsed.displayArray[8][0].should.equal('gender'),
                    'gender =': parsed.displayArray[8][1].should.equal('='),
                    'male': parsed.displayArray[8][2].should.equal('male'),
                    'male OR': parsed.displayArray[8][3].should.equal('OR'),
                    'type': parsed.displayArray[8][4].should.equal('type'),
                    'type =': parsed.displayArray[8][5].should.equal('='),
                    'person': parsed.displayArray[8][6].should.equal('person'),
                    'person AND': parsed.displayArray[8][7].should.equal('AND'),
                    'location': parsed.displayArray[8][8].should.equal('location'),
                    'location IN': parsed.displayArray[8][9].should.equal('IN'),
                    '(NY, America)': [
                        parsed.displayArray[8][10].should.be.an.Array,
                        parsed.displayArray[8][10].should.have.length(2),
                        parsed.displayArray[8][10][0].should.equal('NY'),
                        parsed.displayArray[8][10][1].should.equal('America')
                    ],
                    '(NY, America) AND': parsed.displayArray[8][11].should.equal('AND'),
                    'hobby': parsed.displayArray[8][12].should.equal('hobby'),
                    'hobby = ': parsed.displayArray[8][13].should.equal('='),
                    'coding': parsed.displayArray[8][14].should.equal('coding')
                };
            });
        });

        describe('results.syntaxTree', function() {

            it('should use the results.logicalArray to build a tree object.', function() {
            
                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');
            
                const tests = {
                    'name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)': [
                        parsed.syntaxTree.should.have.property('AND').which.is.an.Array,
                        parsed.syntaxTree.AND.should.have.length(2)
                    ],
                    'name = shaun AND job = developer': [
                        parsed.syntaxTree.AND[0].should.have.property('AND').which.is.an.Array,
                        parsed.syntaxTree.AND[0].AND.should.have.length(2)
                    ],
                    'name = shaun': [
                        parsed.syntaxTree.AND[0].AND[0].should.have.property('=').which.is.an.Array,
                        parsed.syntaxTree.AND[0].AND[0]['='].should.have.length(2)
                    ],
                    'name': parsed.syntaxTree.AND[0].AND[0]['='][0].should.equal('name'),
                    'shaun': parsed.syntaxTree.AND[0].AND[0]['='][1].should.equal('shaun'),
                    'job = developer': [
                        parsed.syntaxTree.AND[0].AND[1].should.have.property('=').which.is.an.Array,
                        parsed.syntaxTree.AND[0].AND[1]['='].should.have.length(2)
                    ],
                    'job': parsed.syntaxTree.AND[0].AND[1]['='][0].should.equal('job'),
                    'developer': parsed.syntaxTree.AND[0].AND[1]['='][1].should.equal('developer'),
                    '(gender = male OR type = person AND location IN (NY, America) AND hobby = coding)': [
                        parsed.syntaxTree.AND[1].should.have.property('AND').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND.should.have.length(2)
                    ],
                    'gender = male OR type = person AND location IN (NY, America)': [
                        parsed.syntaxTree.AND[1].AND[0].should.have.property('AND').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND.should.have.length(2)
                    ],
                    'gender = male OR type = person': [
                        parsed.syntaxTree.AND[1].AND[0].AND[0].should.have.property('OR').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND[0].OR.should.have.length(2)
                    ],
                    'gender = male': [
                        parsed.syntaxTree.AND[1].AND[0].AND[0].OR[0].should.have.property('=').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND[0].OR[0]['='].should.have.length(2)
                    ],
                    'gender': parsed.syntaxTree.AND[1].AND[0].AND[0].OR[0]['='][0].should.equal('gender'),
                    'male': parsed.syntaxTree.AND[1].AND[0].AND[0].OR[0]['='][1].should.equal('male'),
                    'type = person': [
                        parsed.syntaxTree.AND[1].AND[0].AND[0].OR[1].should.have.property('=').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND[0].OR[1]['='].should.have.length(2)
                    ],
                    'type': parsed.syntaxTree.AND[1].AND[0].AND[0].OR[1]['='][0].should.equal('type'),
                    'person': parsed.syntaxTree.AND[1].AND[0].AND[0].OR[1]['='][1].should.equal('person'),
                    'location IN (NY, America)': [
                        parsed.syntaxTree.AND[1].AND[0].AND[1].should.have.property('IN').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND[1].IN.should.have.length(2)
                    ],
                    'location': parsed.syntaxTree.AND[1].AND[0].AND[1].IN[0].should.equal('location'),
                    '(NY, America)': [
                        parsed.syntaxTree.AND[1].AND[0].AND[1].IN[1].should.be.an.Array,
                        parsed.syntaxTree.AND[1].AND[0].AND[1].IN[1].should.have.length(2)
                    ],
                    'NY': parsed.syntaxTree.AND[1].AND[0].AND[1].IN[1][0].should.equal('NY'),
                    'America': parsed.syntaxTree.AND[1].AND[0].AND[1].IN[1][1].should.equal('America'),
                    'hobby = coding': [
                        parsed.syntaxTree.AND[1].AND[1].should.have.property('=').which.is.an.Array,
                        parsed.syntaxTree.AND[1].AND[1]['='].should.have.length(2)
                    ],
                    'hobby': parsed.syntaxTree.AND[1].AND[1]['='][0].should.equal('hobby'),
                    'coding': parsed.syntaxTree.AND[1].AND[1]['='][1].should.equal('coding')
                };
            
            });
        });
        
    });
});
