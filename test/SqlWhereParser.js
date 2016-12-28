"use strict";

const should = require('should');
const SqlWhereParser = require('../SqlWhereParser');
const parser = new SqlWhereParser();

function equals(obj1, obj2) {

    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        throw new Error('The two objects are not the same.');
    }
}

describe('SqlWhereParser', function() {
    
    
    describe('What is it?', function() {

        it('SqlWhereParser parses the WHERE portion of an SQL-like string into an AST');
        it('You can also evaluate the query in-line as the expressions are being built');
        it('This evaluation can also be used to convert the AST into a specific tree, like a MongoDB query');

        it('SqlWhereParser can also parse into an array-like structure');
        it('This array structure is useful for displaying the query on the front-end, e.g. as HTML');
    });
    
    describe('Installation', function() {

        it('`npm install sql-where-parser`', function() {
            // or if in the browser: <script src="sql-where-parser/sql-where-parser.min.js"></script>
        });
    });
    
    describe('Usage', function() {
       
        it('`require` it, and create a new instance');
    });

    describe('Advanced Usage', function() {

        describe('Supplying a config object to the constructor is also possible (see ".defaultConfig" in the #API section for all options)', function() {
            
            it('This can be used to create new operators');
        });
    });
    
    describe('API', function() {

        describe('#parse(sql:String):Object', function() {
           
            it('Parses the SQL string into an AST, using the default evaluator');
            it('Throws a SyntaxError if the supplied parentheses do not match');
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

        describe('#tokenizer:Tokenizer', function() {

            it('The tokenizer used on the string. Documentation coming soon');
        });

        describe('#operators:Object', function() {

            it('An object whose keys are the supported operator values, and whose values are instances of the Operator class');
        });
        
        describe('.defaultConfig:Object', function() {
           
            it('The default config object used when no config is supplied');
        });

        describe('.Operator:Operator', function() {

            it('The Operator class');
        });

        describe('.OPERATOR_UNARY_MINUS:Symbol', function() {

            it('The Symbol used as the unary minus operator value');
        });
    });
});
