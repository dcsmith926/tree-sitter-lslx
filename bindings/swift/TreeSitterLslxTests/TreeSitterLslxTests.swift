import XCTest
import SwiftTreeSitter
import TreeSitterLslx

final class TreeSitterLslxTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_lslx())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Linden Scripting Language Extended grammar")
    }
}
