// Markov is a simple Markov algorithm (famously known as Normal algorithms) interpreter.
//
// There are 3 components to this library:
//
//   1. Markov.Statement
//   2. Markov.Algorithm
//   3. Markov.Runner
var Markov = {};

// **Markov.Statement**
//
// A Markov.Statement is a string rewriting statement. Generally these are represented as:
// `lhs -> rhs` where the first occurence of `lhs` in the context string gets rewritten as
// `rhs`. This object contains the 'compiled' form of the statement, and can handle any
// form.
//
//  **Note:** The *empty word* or *empty string* is represented by `!`.
Markov.Statement = (function() {
  // Markov.Statement Constructor
  //
  // `from`    - the L.H.S. of the rewrite rule
  // `to`      - the R.H.S. of the rewrite rule
  // `closing` - boolean whether this is a closing (terminating) statement
  var Statement = function(from, to, closing) {
    this.setFrom(from);
    this.setTo(to);

    this.closing = closing;
  };

  // This is the regular expression that `Markov.Statement.compile()` uses to compile rewrite
  // rules into a Markov.Statement.
  //
  // For details, see https://regex101.com/r/OrVles (4 versions)
  Statement.REGEX = /^\s*(\!?[^\s!\.]*\!?)\s*[=-]\s*>\s*(\.)*\s*(\!?[^\s!\.]*\!?)\s*$/i;

  // Escapes the L.H.S. and R.H.S. contents of a rewrite rule to be a valid regular expression.
  //
  Statement.regexpEscape = function(text) {
    return text.replace(/[-{}()*+?.,\\^$|#\s]/g, "\\$&");
  };

  // Compiles a rewrite statement in the form of:
  //
  //     lhs ->. rhs
  //
  // *or*
  //
  //     lhs =>. rhs
  //
  // Wehere a `.` after the consequence symbol signifies a closing rewrite rule (terminates the algorithm).
  // There can be any amount of whitespace between any part, except for in the `lhs` and `rhs`.
  //
  // For example, the following is **not** a valid statement:
  //
  //     in valid -> statement
  //
  Statement.compile = function(statement) {
    var compiled = Statement.REGEX.exec(statement);

    if (!compiled) {
      throw new Error('Invalid statement: ' + statement);
    }

    if (compiled[1].length < 1) {
      throw new Error('Invalid statement, there is no LHS: ' + statement);
    }

    if (compiled[3].length < 1) {
      throw new Error('Invalid statement, there is no RHS: ' + statement);
    }

    if (compiled[1] === "!!") {
      throw new Error('Invalid statement, LHS contains two empty word denominators: ' + statement);
    }

    if (compiled[3] === "!!") {
      throw new Error('Invalid statement, RHS contains two empty word denominators: ' + statement);
    }

    return new Statement(compiled[1], compiled[3], !!compiled[2]);
  };

  // Sets the `from` property of the Markov.Statement object, i.e. automatically compiles a
  // searching regular expression for the L.H.S. of the rewrite rule under the
  // `fromRegExp` property.
  //
  //  **Note:** Neither the compiled reg. exp. nor the `from` property contain the empty
  // string character. They automatically get compiled to their functional representation.
  //
  Statement.prototype.setFrom = function(from) {
    var clean = from.replace('!', '').replace('!', '');

    //this.fromRegExp = Statement.regexpEscape(clean);

    if (from === '!') {
      //this.fromRegExp = new RegExp('(^|$|^$)');
      this.from = clean;

      return undefined;
    }

    if (from.search('!') == 0) {
      //this.fromRegExp = '^' + this.fromRegExp;
      from = from.replace('!', '');
    }

    // if (from.search('!') > -1) {
    //   this.fromRegExp += "$";
    // }

    //this.fromRegExp = new RegExp(this.fromRegExp);
    this.from = clean;
  };

  // Sets the `to` property of the Markov.Statement object.
  //
  // **Note:** The `to` property does not contain the empty string character. It automatically
  // gets cleaned up to its functional representation.
  //
  Statement.prototype.setTo = function(to) {
    var clean = to.replace('!', '').replace('!', '');
    this.to = clean;
  };

  Statement.prototype.toString = function() {
    var statement = (this.from.length < 1 ? '!' : this.from);
    statement += (this.closing ? ' ->. ' : ' -> ')
    statement += (this.to.length < 1 ? '!' : this.to);

    return statement;
  };

  return Statement;
}).call();

// **Markov.Algorithm**
//
// A Markov.Algorithm is an ordered collection of at least one Markov.Statement.
//
Markov.Algorithm = (function() {
  var Algorithm = function() {
    this.statements = [];
  };

  // Returns `true` if this Markov.Algorithm has any statements in it.
  //
  Algorithm.prototype.hasStatements = function() {
    return this.statements.length > 0;
  };

  // Returns a copy of the statements inside this Markov.Algorithm.
  //
  Algorithm.prototype.getStatements = function() {
    return Array.apply([], this.statements);
  };

  // Gets a statement at a specified position inside this Markov.Algorithm.
  //
  Algorithm.prototype.getStatement = function(position) {
    return this.statements[position];
  };

  // Sets a statement at a specified position inside this Markov.Algorithm.
  // It's not wise to change a statement when a Markov.Algorithm is running inside
  // a Markov.Runner.
  //
  Algorithm.prototype.setStatement = function(statement, position) {
    if (!(statement instanceof Markov.Statement)) {
      throw new Error('Statement must be an instance of Markov.Statement.');
    }

    var previous = this.statements[position];
    this.statements[position] = statement;

    return previous;
  };

  // Adds a statement at the beginning, end or anywhere in between.
  //
  // `statement` - the statement to add
  // `position`  - the position where to add the statement
  //               if less than 0 puts it at the top of the algorithm
  //               if greather than the number of statements or omitted, puts it at the end
  //
  Algorithm.prototype.addStatement = function(statement, position) {
    if (!(statement instanceof Markov.Statement)) {
      throw new Error('Statement must be an instance of Markov.Statement.');
    }

    if (typeof position === 'undefined' || typeof position === 'null' || statement < 0 || statement > this.statements.length) {
      this.statements.push(statement);
    } else {
      this.statements = this.statements.slice(0, position).concat(statement).concat(this.statements.slice(position));
    }

    return this;
  };

  // Removes a statement from a specified position. See #addStatement() for the conventions.
  Algorithm.prototype.removeStatement = function(position) {
    if (typeof position === 'undefined' || typeof position === 'null' || position >= this.statements.length - 1) {
      return this.statements.pop();
    } else if (position < 0) {
      return this.statements.shift();
    }

    var statement = this.statements[position];

    this.statements = this.statements.slice(0, position).concat(this.statements.slice(0, position + 1));

    return statement;
  };

  return Algorithm;
}).call();

// **Markov.Runner**
//
// Markov.Runner is runs a Markov.Algorithm over a certain string context.
Markov.Runner = (function() {

  // Markov.Runner Constructor
  //
  // Constructs a new Markov.Runner object. Markov.Runner objects are meant to be for
  // one-time use, meaning you should create a new runner every single time you wish
  // to run a Markov.Algorithm.
  //
  // `algorithm` - the Markov.Algorithm to be executed
  // `context`   - a string representing the context
  //
  //  *Properties*:
  //
  // `context`   - the current executing context
  // `algorithm` - the Markov.Algorithm to be executed
  // `steps`     - an array of `{ context: ..., statement: ... }` containing all of the steps
  // `done`      - boolean whether the execution has finished
  //
  var Runner = function(algorithm, context) {
    if (!algorithm || !(algorithm instanceof Markov.Algorithm)) {
      throw new Error('Markov.Runner requires a non-null Markov.Algorithm to run.');
    }

    if (typeof context !== 'string') {
      throw new Error('Markov.Runner requires a non-null String context.');
    }

    this.context = context;
    this.algorithm = algorithm;

    this.steps = [];
    this.done = false;
  };

  // Runs the current Markov.Algorithm over the string context.
  //
  Runner.prototype.run = function(interval) {
    if (this.done) {
      return false;
    }

    while (!this.done) this.step();

    return true;
  };

  // Stops the Markov.Runner, after this the `done` property will be set to `true`.
  //
  Runner.prototype.stop = function() {
    this.done = true;
  };

  // Returns the Markov.Statement from the algorithm that was chosen, or `null` if none was
  // applicable (natural termination).
  //
  Runner.prototype.step = function() {
    if (this.done) {
      return null;
    }

    if (this.steps.length < 1) {
      this.steps.push({ context: this.context, statement: null });
    }

    var statements = this.algorithm.getStatements(),
      i = 0,
      acted = false,
      statement = null;

    for (i = 0; i < statements.length; i++) {
      statement = statements[i];

      var to = statement.to,
        from = statement.from;

      if (this.context.search(statement.from) > -1) {
        this.context = this.context.replace(statement.from, statement.to);
      } else {
        continue;
      }

      this.steps.push({ context: this.context, statement: statement });

      acted = true;

      break;
    }

    // REWRITE FOR NOT NODE.JS
    //
    // if ((this.steps.length - 2 > -1) && this.context === this.steps[this.steps.length - 2].context) {
    //   this._scheduleCall(0, function() {
    //     this.emit('infinity', { statement: statement, context: this.context });
    //   }.bind(this));
    // }

    if (!acted || statement.closing) {
      this.stop();
    }

    return acted ? statement : null;
  };

  return Runner;
}).call();
