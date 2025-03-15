from unittest import TestCase

import tree_sitter
import tree_sitter_lslx


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            tree_sitter.Language(tree_sitter_lslx.language())
        except Exception:
            self.fail("Error loading Linden Scripting Language Extended grammar")
