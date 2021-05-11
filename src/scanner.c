#include <string.h>
#include <tree_sitter/parser.h>

enum TokenType {
	CONTENT,
	BACKTICK_START,
	BACKTICK_END,
	STRING_START,
	STRING_END,
};

struct lex_state {
	char kind;
	bool triple;
};

void *tree_sitter_just_external_scanner_create() {
	return calloc(1, sizeof(struct lex_state));
}

void tree_sitter_just_external_scanner_destroy(void *state) {
	free(state);
}

unsigned tree_sitter_just_external_scanner_serialize(void *payload, char *buffer) {
	struct lex_state *state = payload;
	size_t idx = 0;
	buffer[idx++] = state->kind;
	buffer[idx++] = state->triple;

	return idx;
}

void tree_sitter_just_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
	if (length < 2) {
		return;
	}
	struct lex_state *state = payload;
	state->kind = *buffer++;
	state->triple = *buffer;
}

static void advance(TSLexer *lexer) {
	lexer->advance(lexer, false);
}

static void mark_end(TSLexer *lexer) {
	lexer->mark_end(lexer);
}

void scan_start(char kind, struct lex_state *state, TSLexer *lexer) {
	state->kind = kind;
	state->triple = false;
	advance(lexer);
	mark_end(lexer);
	if (lexer->lookahead == kind) {
		advance(lexer);
		if (lexer->lookahead == kind) {
			advance(lexer);
			mark_end(lexer);
			state->triple = true;
		}
	}
}

enum TokenType end_symbol(char kind) {
	if (kind == '`') {
		return BACKTICK_END;
	} else {
		return STRING_END;
	}
}


bool tree_sitter_just_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
	struct lex_state *state = payload;

	if (valid_symbols[CONTENT]) {
		bool has_content = false;
		lexer->result_symbol = CONTENT;
		while (lexer->lookahead) {
			if (lexer->lookahead == '\\' && state->kind != '\'') {
				return has_content;
			} else if (lexer->lookahead == state->kind) {
				if (state->triple) {
					mark_end(lexer);
					advance(lexer);
					if (lexer->lookahead == state->kind) {
						advance(lexer);
						if (lexer->lookahead == state->kind) {
							if (!has_content) {
								advance(lexer);
								mark_end(lexer);
								lexer->result_symbol = end_symbol(state->kind);
							}
							return true;
						}
					}
				} else {
					if (!has_content) {
						advance(lexer);
						lexer->result_symbol = end_symbol(state->kind);
					}
					return true;
				}
			}
			advance(lexer);
			has_content = true;
		}
	} else if (valid_symbols[BACKTICK_START] && lexer->lookahead == '`') {
		scan_start('`', state, lexer);
		lexer->result_symbol = BACKTICK_START;
		return true;
	} else if (valid_symbols[STRING_START] && (lexer->lookahead == '\"' || lexer->lookahead == '\'')) {
		scan_start(lexer->lookahead, state, lexer);
		lexer->result_symbol = STRING_START;
		return true;
	}
	return false;
}


