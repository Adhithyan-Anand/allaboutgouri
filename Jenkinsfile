// gouri-demo.resonor.in · build and deploy on the server Jenkins runs on.
//
// Flow: verify -> build image -> deploy with docker compose -> health check
//       -> purge Cloudflare cache. If the new container is unhealthy, the
//       previous image is put back automatically.
//
// Needs on the Jenkins agent: docker with the compose plugin, python3, curl,
// and the jenkins user in the docker group. Credentials are optional; see README.

pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timeout(time: 15, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // Checks GitHub every 5 minutes. With a GitHub webhook set up, this can go.
  triggers {
    pollSCM('H/5 * * * *')
  }

  parameters {
    booleanParam(name: 'USE_TUNNEL', defaultValue: false,
      description: 'Also run the cloudflared container (needs the cloudflare-tunnel-token credential). Leave off if cloudflared already runs on the server.')
    booleanParam(name: 'PURGE_CACHE', defaultValue: true,
      description: 'Purge the Cloudflare cache after a successful deploy (needs cloudflare-zone-id and cloudflare-api-token credentials).')
  }

  environment {
    COMPOSE_PROJECT_NAME = 'allaboutgouri'
    IMAGE    = 'allaboutgouri'
    CONTAINER = 'allaboutgouri'
    WEB_PORT = '8088'
  }

  stages {
    stage('Verify') {
      steps {
        sh 'python3 scripts/verify.py'
      }
    }

    stage('Build') {
      steps {
        sh '''
          set -e
          # keep the running image so a bad deploy can be rolled back
          if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
            docker tag "$IMAGE:latest" "$IMAGE:previous"
          fi
          docker compose build --pull web
          docker tag "$IMAGE:latest" "$IMAGE:$(git rev-parse --short HEAD)"
        '''
      }
    }

    stage('Deploy') {
      steps {
        script {
          env.DEPLOY_STARTED = 'true'
          if (params.USE_TUNNEL) {
            withCredentials([string(credentialsId: 'cloudflare-tunnel-token', variable: 'CLOUDFLARE_TUNNEL_TOKEN')]) {
              sh 'docker compose --profile tunnel up -d --no-build'
            }
          } else {
            sh 'docker compose up -d --no-build web'
          }
        }
      }
    }

    stage('Health check') {
      steps {
        sh '''
          set -e
          echo "waiting for $CONTAINER to report healthy..."
          for i in $(seq 1 30); do
            status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)
            [ "$status" = "healthy" ] && break
            sleep 2
          done
          [ "$status" = "healthy" ] || { echo "container status: $status"; exit 1; }
          # the page itself must come back, not just /healthz
          docker exec "$CONTAINER" wget -qO- http://127.0.0.1:8080/ | grep -q "Gouri Lakshmi"
          echo "site is up on 127.0.0.1:$WEB_PORT"
        '''
      }
    }

    
  }

  post {
    failure {
      script {
        if (env.DEPLOY_STARTED == 'true') {
          echo 'Deploy failed: rolling back to the previous image'
          sh '''
            docker logs --tail 50 "$CONTAINER" || true
            if docker image inspect "$IMAGE:previous" >/dev/null 2>&1; then
              docker tag "$IMAGE:previous" "$IMAGE:latest"
              docker compose up -d --no-build web
            else
              echo "no previous image to roll back to"
            fi
          '''
        }
      }
    }
    always {
      // clear out untagged leftovers from this project's builds only
      sh 'docker image prune -f --filter "label=org.opencontainers.image.title=allaboutgouri" || true'
    }
  }
}
