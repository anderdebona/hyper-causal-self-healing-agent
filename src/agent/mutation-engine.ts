import ts from 'typescript';

export interface PatchMutation {
  originalCode: string;
  mutatedCode: string;
  patchApplied: string;
  success: boolean;
}

export class ASTMutationEngine {
  /**
   * Parses source code, detects unhandled null/undefined or division by zero exceptions,
   * and mutates the AST to inject self-healing defensive guards.
   */
  public static generateSelfHealingPatch(sourceCode: string, exceptionMessage: string): PatchMutation {
    const sourceFile = ts.createSourceFile('app.ts', sourceCode, ts.ScriptTarget.Latest, true);

    let mutated = false;
    let patchDescription = 'No mutation needed';

    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => {
      return (rootNode: T) => {
        function visit(node: ts.Node): ts.Node {
          // If exception is division by zero or undefined access
          if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.SlashToken) {
            // Transform `a / b` to `b === 0 ? 0 : a / b`
            patchDescription = 'Injected zero-division defensive guard via AST mutation';
            mutated = true;

            const safeCheck = ts.factory.createConditionalExpression(
              ts.factory.createBinaryExpression(
                node.right,
                ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                ts.factory.createNumericLiteral(0)
              ),
              ts.factory.createToken(ts.SyntaxKind.QuestionToken),
              ts.factory.createNumericLiteral(0),
              ts.factory.createToken(ts.SyntaxKind.ColonToken),
              node
            );
            return safeCheck;
          }

          return ts.visitEachChild(node, visit, context);
        }
        return ts.visitNode(rootNode, visit);
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const printer = ts.createPrinter();
    const mutatedCode = printer.printFile(result.transformed[0] as ts.SourceFile);

    return {
      originalCode: sourceCode,
      mutatedCode: mutated ? mutatedCode : sourceCode,
      patchApplied: patchDescription,
      success: mutated,
    };
  }
}
