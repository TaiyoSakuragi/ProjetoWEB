from flask import jsonify


def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"msg": "Requisição inválida"}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"msg": "Recurso não encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"msg": "Método não permitido"}), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"msg": "Dados inválidos"}), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"msg": "Erro interno do servidor"}), 500
