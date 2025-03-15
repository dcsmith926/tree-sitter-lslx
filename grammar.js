/**
 * @file Tree-sitter parser for Linden Scripting Language Extended
 * @author Doug Smith <dcsmith926@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({

    name: "lslx",

    extras: $ => [
        $.comment,        
        /\s/,
    ],

    word: $ => $.identifier,

    rules: {

        script: $ => repeat1($._top_statement),

        _top_statement: $ => choice(
            $.import_statement,
            $.state_definition,
            $.function_definition,
            $._statement,
        ),

        import_statement: $ => seq(
            "import",
            commaSep1($.import_specifier),
            "from",
            field("source", $.string),
            ";",
        ),

        import_specifier: $ => choice(
            field("name", $.identifier),
            seq(
                field("name", $.identifier),
                "as",
                field("alias", $.identifier),
            ),
        ),

        state_definition: $ => seq(
            $.state_name_declaration,
            "{",
            repeat($.event_handler),
            "}",
        ),

        state_name_declaration: $ => choice(
            "default",
            seq("state", field("name", $.identifier)),
        ),

        event_handler: $ => seq(
            field("name", $.identifier),
            field("parameters", $.parameter_list),
            field("body", $.block),
        ),

        function_definition: $ => seq(
            field("return_type", $.type),
            field("name", $.identifier),
            field("parameters", $.parameter_list),
            field("body", $.block),
        ),

        type: $ => choice(
            "integer",
            "float",
            "string",
            "key",
            "list",
            "vector",
            "rotation",
            "quaternion",
            "void",
        ),

        // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
        comment: $ => token(choice(
            seq("//", /[^\r\n\u2028\u2029\u0085]*/),
            seq(
                "/*",
                /[^*]*\*+([^/*][^*]*\*+)*/,
                "/",
            ),
        )),

        identifier: $ => /[A-Za-z_][A-Za-z_\d]*/,

        parameter_list: $ => seq(
            "(",
            commaSep($.parameter),
            ")",
        ),

        parameter: $ => seq(
            field("type", $.type),
            field("name", $.identifier),
        ),

        block: $ => seq(
            "{",
            repeat($._statement),
            "}",
        ),

        _statement: $ => choice(
            $.if_statement,
            $.while_statement,
            $.do_while_statement,
            $.for_statement,
            $.switch_statement,
            $.break_statement,
            $.continue_statement,
            $.return_statement,
            $.jump_statement,
            $.state_change_statement,
            $.label_statement,
            $.variable_declaration_statement,
            $.expr_statement,
        ),

        _else_clause: $ => seq(
            "else",
            choice(
                $._statement,
                $.block,
            ),
        ),

        if_statement: $ => prec.right(seq(
            "if",
            field("condition", $._parenthetical_expression),
            field("consequence", choice($._statement, $.block)),
            optional(field("alternative", $._else_clause)),
        )),

        while_statement: $ => seq(
            "while",
            field("condition", $._parenthetical_expression),
            field("body", choice($._statement, $.block)),
        ),

        do_while_statement: $ => seq(
            "do",
            field("body", choice($._statement, $.block)),
            "while",
            field("condition", $._parenthetical_expression),
            ";",
        ),

        for_statement: $ => seq(
            "for",
            "(",
            field("initializer", seq(commaSep($._expression), ";")),
            field("condition", seq($._expression, ";")),
            field("increment", commaSep($._expression)),
            ")",
            field("body", choice($._statement, $.block)),
        ),

        switch_statement: $ => seq(
            "switch",
            field("value", $._parenthetical_expression),
            field("body", $.switch_body),
        ),

        switch_body: $ => seq(
            "{",
            repeat(choice(
                $.switch_case,
                $.switch_default,
            )),
            "}",
        ),

        switch_case: $ => seq(
            "case",
            field("value", $._expression),
            ":",
            field("body", $.switch_case_body),
        ),

        switch_default: $ => seq(
            "default",
            ":",
            field("body", $.switch_case_body),
        ),

        switch_case_body: $ => repeat1($._statement),

        break_statement: $ => seq("break", ";"),

        continue_statement: $ => seq("continue", ";"),

        return_statement: $ => seq(
            "return",
            optional(field("value", $._expression)),
            ";"
        ),

        jump_statement: $ => seq(
            "jump",
            field("name", $.identifier),
            ";"
        ),

        state_change_statement: $ => seq(
            "state",
            field("name", $.identifier),
            ";"
        ),

        // we can't put a production into "token", so we use the raw regex
        // this means we can't test for the presence of the "name" field in our tests
        label_statement: $ => seq(
            "@",
            token.immediate(field("name", /[A-Za-z_][A-Za-z_\d]*/)),
            ";",
        ),

        variable_declaration_statement: $ => seq(
            field("type", $.type),
            commaSep1($.variable_declarator),
            ";",
        ),

        variable_declarator: $ => seq(
            field("name", $.identifier),
            optional($._initializer),
        ),

        _initializer: $ => seq(
            "=",
            field("value", $._expression),
        ),

        expr_statement: $ => seq($._expression, ";"),

        _expression: $ => choice(
            $._parenthetical_expression,
            $._primary_expression,
            $.unary_expression,
            $.binary_expression,
        ),

        _parenthetical_expression: $ => seq(
            "(",
            $._expression,
            ")",
        ),

        _primary_expression: $ => choice(
            $.function_call,
            $.vec_or_rot_subscript,
            $.identifier,
            $.string,
            $._float,
            $._integer,
            $.list,
            $.vector,
            $.rotation,
        ),

        // precedence levels from https://wiki.secondlife.com/wiki/LSL_Operators
        unary_expression: $ => choice(

            prec.right(14, seq(field("operator",  "-"), field("operand", $._expression))),
            prec.right(14, seq(field("operator",  "!"), field("operand", $._expression))),
            prec.right(14, seq(field("operator",  "~"), field("operand", $._expression))),
            prec.right(14, seq(field("operator", "++"), field("operand", $._expression))),
            prec.right(14, seq(field("operator", "--"), field("operand", $._expression))),

            prec.left(14, seq(field("operand", $._expression), field("operator", "++"))),
            prec.left(14, seq(field("operand", $._expression), field("operator", "--"))),

            prec.right(15, seq(field("operator", $.type_cast), field("operand", $._expression))),
        ),

        binary_expression: $ => choice(

            prec.right(1, seq(field("left", $._expression), field("operator", "*="), field("right", $._expression))),
            prec.right(1, seq(field("left", $._expression), field("operator", "/="), field("right", $._expression))),
            prec.right(1, seq(field("left", $._expression), field("operator", "+="), field("right", $._expression))),
            prec.right(1, seq(field("left", $._expression), field("operator", "-="), field("right", $._expression))),
            prec.right(1, seq(field("left", $._expression), field("operator", "%="), field("right", $._expression))),
            prec.right(1, seq(field("left", $._expression), field("operator",  "="), field("right", $._expression))),

            prec.left(2, seq(field("left", $._expression), field("operator", "&&"), field("right", $._expression))),
            prec.left(3, seq(field("left", $._expression), field("operator", "||"), field("right", $._expression))),
            prec.left(4, seq(field("left", $._expression), field("operator",  "|"), field("right", $._expression))),
            prec.left(5, seq(field("left", $._expression), field("operator",  "^"), field("right", $._expression))),
            prec.left(6, seq(field("left", $._expression), field("operator",  "&"), field("right", $._expression))),

            prec.left(7, seq(field("left", $._expression), field("operator", "=="), field("right", $._expression))),
            prec.left(7, seq(field("left", $._expression), field("operator", "!="), field("right", $._expression))),

            prec.left(8, seq(field("left", $._expression), field("operator",  "<"), field("right", $._expression))),
            prec.left(8, seq(field("left", $._expression), field("operator", "<="), field("right", $._expression))),
            prec.left(8, seq(field("left", $._expression), field("operator",  ">"), field("right", $._expression))),
            prec.left(8, seq(field("left", $._expression), field("operator", ">="), field("right", $._expression))),

            prec.left(9, seq(field("left", $._expression), field("operator", "<<"), field("right", $._expression))),
            prec.left(9, seq(field("left", $._expression), field("operator", ">>"), field("right", $._expression))),

            // TODO: list concatenation is 10, but addition and string concatenation is 11
            prec.left(10, seq(field("left", $._expression), field("operator", "+"), field("right", $._expression))),

            prec.left(12, seq(field("left", $._expression), field("operator", "-"), field("right", $._expression))),

            prec.left(13, seq(field("left", $._expression), field("operator", "*"), field("right", $._expression))),
            prec.left(13, seq(field("left", $._expression), field("operator", "/"), field("right", $._expression))),
            prec.left(13, seq(field("left", $._expression), field("operator", "%"), field("right", $._expression))),
        ),

        function_call: $ => seq(
            field("name", $.identifier),
            "(",
            optional(field("arguments", $.function_arguments)),
            ")",
        ),

        function_arguments: $ => commaSep1($._expression),

        vec_or_rot_subscript: $ => seq(
            field("variable", $.identifier),
            token.immediate("."),
            field("member", token.immediate(/x|y|z|w/)),
        ),

        type_cast: $ => seq(
            "(",
            field("type", $.type),
            ")",
        ),

        string: $ => seq(
            '"',
            repeat(
                choice(
                    $.unescaped_string_fragment,
                    $.escape_sequence,
                ),
            ),
            '"',
        ),

        unescaped_string_fragment: $ => token.immediate(prec(1, /[^"\\\r\n]+/)),

        escape_sequence: $ => token.immediate(seq(
            "\\",
            /[^\r\n]/,
        )),

        _float: $ => choice(
            $.float_e,
            $.float_normal,
        ),

        float_e: $ => /\d+\.\d*E(\+|\-)\d+/,

        float_normal: $ => /\d+\.\d+/,

        _integer: $ => choice(
            $.integer_hex,
            $.integer_dec,
        ),

        integer_hex: $ => /0x[\dA-F]+/,

        integer_dec: $ => /\d+/,

        list: $ => seq(
            "[",
            commaSep($._expression),
            "]",
        ),

        vector: $ => seq(
            "<",
            field("x", $._expression),
            ",",
            field("y", $._expression),
            ",",
            field("z", $._expression),
            ">",
        ),

        rotation: $ => seq(
            "<",
            field("x", $._expression),
            ",",
            field("y", $._expression),
            ",",
            field("z", $._expression),
            ",",
            field("w", $._expression),
            ">",
        ),
    },
});

function commaSep1(rule) {
    return seq(rule, repeat(seq(",", rule)));
}

function commaSep(rule) {
    return optional(commaSep1(rule));
}