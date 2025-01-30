from flask import Flask, request, Response
import requests
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

# Your GeoServer WMS endpoint
GEOSERVER_WMS_URL = "http://localhost:8080/geoserver/ows?"

# Layers allowed to be accessed via the API
ALLOWED_LAYERS = {"etain_maps:output_db_test_CH4_3035", "etain_maps:output_db_test_CH4_4326"}

@app.route('/wms-proxy', methods=['GET'])
def wms_proxy():
    # Forward query parameters
    query_params = request.args.to_dict()

    # Validate the requested layer
    requested_layers = query_params.get("layers", "")
    if not requested_layers or not all(
        layer in ALLOWED_LAYERS for layer in requested_layers.split(",")
    ):
        return Response("Layer not allowed or missing.", status=403)

    # Forward the request to GeoServer
    try:
        geo_response = requests.get(GEOSERVER_WMS_URL, params=query_params, stream=True)
        # Return GeoServer's response with correct headers
        return Response(
            geo_response.iter_content(chunk_size=8192),
            status=geo_response.status_code,
            content_type=geo_response.headers.get("Content-Type", "image/png"),
        )
    except requests.RequestException as e:
        return Response(f"Error communicating with GeoServer: {str(e)}", status=500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
