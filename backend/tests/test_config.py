from app.config import Settings


def test_default_cors_origins_allow_production_frontend():
    settings = Settings(_env_file=None)

    assert "https://reconiq-pasi.vercel.app" in settings.CORS_ORIGINS
