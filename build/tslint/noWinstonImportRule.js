"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Lint = require("tslint");
const NoImportWalker_1 = require("./NoImportWalker");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new NoImportWalker_1.NoImportWalker((s) => s === "'winston'", Rule.FAILURE_STRING, sourceFile, this.getOptions()));
    }
}
Rule.FAILURE_STRING = "import from 'winston' is forbidden";
exports.Rule = Rule;
//# sourceMappingURL=noWinstonImportRule.js.map