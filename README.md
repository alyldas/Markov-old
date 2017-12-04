# Markov
Markov is a simple Markov algorithm (famously known as Normal algorithms) interpreter.
# Example of use
In order to execute the algorithm in the Developer Console, you need to execute the following commands sequentially:
1. `var algorithm = new Markov.Algorithm();`
1. `algorithm.addStatement(Markov.Statement.compile(statement));`, where statement is "lhs -> rhs", as example.
1. `var runner = new Markov.Runner(algorithm, inputWord);`
1. `runner.run();` or `runner.step();` as long as 'runner.done' = false

During the execution, the property 'runner.context' changes.
