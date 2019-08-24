"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Lint = require("tslint");
class NoImportWalker extends Lint.RuleWalker {
    constructor(matcher, failureString, sourceFile, options) {
        super(sourceFile, options);
        this.matcher = matcher;
        this.failureString = failureString;
    }
    visitImportDeclaration(node) {
        if (this.matcher(node.moduleSpecifier.getText())) {
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), this.failureString));
        }
        super.visitImportDeclaration(node);
    }
}
exports.NoImportWalker = NoImportWalker;
//# sourceMappingURL=NoImportWalker.js.map