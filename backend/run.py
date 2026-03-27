import os
import sys

# Adiciona o diretório atual ao caminho do Python para garantir a importação dos módulos locais.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importa a função que liga o nosso servidor, lá do arquivo server.py
from app.server import run_server

# Regra: Só inicia o servidor se este arquivo for rodado DIRETAMENTE (não via importação de outro arquivo)
if __name__ == "__main__":
    # Chama a função run_server definindo a porta padrão 8080
    run_server(port=8080)
