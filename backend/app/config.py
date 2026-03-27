import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Localizar o arquivo .env
# Motivo: Precisamos descobrir automaticamente onde está a pasta do projeto para achar o .env
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"

# Carregar as variáveis para a memória do sistema
load_dotenv(dotenv_path=env_path)

# Resgatar as chaves específicas do Supabase
# Estas chaves fazem a conexão criptografada com o Banco e Autenticação
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Validação: Garante que o desenvolvedor não esqueceu o .env
# Motivo: Se não tiver as chaves, o sistema inteiro quebra. É melhor avisar o erro exato na largada.
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY precisam estar configuradas no arquivo .env")

# Criar a conexão oficial
# Essa variável `supabase` é exportada e usada no resto do projeto para fazer os SELECT/UPDATE/INSERT!
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)