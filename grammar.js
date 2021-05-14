const NEWLINE = token.immediate(/(\r?\n)+/);
const INDENT = token.immediate(/[\t ]+/);

module.exports = grammar({
    name: 'just',
    externals: $ => [
        $._content,
        $._backtick_start,
        $._backtick_end,
        $._string_start,
        $._string_end,
    ],
    extras: $ => [$._whitespace, $.comment],
    word: $ => $.name,
    rules: {
        source_file: $ => seq(optional($.shebang), repeat($._item)),

        _item: $ => choice(
            $.recipe,
            $.alias,
            $.assignment,
            $._export,
            $.setting,
            NEWLINE,
        ),

        shebang: $ => /#!.*/,
        comment: $ => /#.*/,
        name: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),
        _whitespace: $ => /[ \t]+/,

        backtick: $ => seq(
            alias($._backtick_start, '`'),
            repeat(choice($.escape, $._not_escape, $._content)),
            alias($._backtick_end, '`')
        ),
        string: $ => seq(
            alias($._string_start, '"'),
            repeat(choice($.escape, $._not_escape, $._content)),
            alias($._string_end, '"')
        ),

        escape: $ => token.immediate(prec(1, seq('\\', /[tnr"\\\n]/))),
        _not_escape: $ => token.immediate('\\'),

        alias: $ => seq(
            'alias',
            $.name,
            ':=',
            $.name,
            NEWLINE,
        ),

        assignment: $ => seq($.name, ':=', $.expression, NEWLINE),
        _export: $ => seq('export', $.assignment),

        setting: $ => seq('set', choice(
            seq('dotenv-load', optional(seq(':=', $.bool))),
            seq('export', optional(seq(':=', $.bool))),
            seq('positional-arguments', optional(seq(':=', $.bool))),
            seq('shell', ':=', '[', $.string, repeat(seq(',', $.string)), optional(','), ']')
        ), NEWLINE),

        bool: $ => choice('true', 'false'),

        expression: $ => choice(
            seq('if', $.condition, '{', $.expression, '}', 'else', '{', $.expression, '}'),
            seq($._value, '+', $._value),
            $._value,
        ),
        _value: $ => choice(
            $._call,
            $.name,
            $.string,
            $.backtick,
            seq('(', $.expression, ')'),
        ),

        _call: $ => prec(1, seq(
            $.name,
            '(',
            optional(seq($.expression, repeat(seq(',', $.expression)), optional(','))),
            ')'
        )),


        condition: $ => seq($.expression, choice('==', '!='), $.expression),

        recipe: $ => prec.left(seq(
            optional('@'),
            $.name,
            repeat($.parameter),
            optional(seq(choice('*', '+'), $.parameter)),
            ':',
            repeat($.dependency),
            NEWLINE,
            optional($.body)
        )),

        parameter: $ => seq($.name, optional(seq('=', $._value))),

        dependency: $ => choice(
            $.name,
            seq('(', $.name, repeat($.expression), ')'),
        ),

        body: $ => prec.left(seq(optional(seq(INDENT, $.shebang)), repeat1($._line))),

        _line: $ => choice(
            seq(INDENT, repeat1(choice($._text, $.interpolation))),
            NEWLINE,
        ),
        _text: $ => token(choice(/[^{\n]+/, '{{{{', '{[^{]')),
        interpolation: $ => seq('{{', $.expression, '}}'),
    }
});
