pipeline {
    agent any
    
    environment {
        // Prevent Next.js telemetry during CI
        NEXT_TELEMETRY_DISABLED = '1'
        // Set Node environment
        NODE_ENV = 'production'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh 'npm ci --prefer-offline --no-audit'
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running lint checks...'
                sh 'npm run lint'
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building Next.js application...'
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                // Uncomment when you have tests configured
                // sh 'npm test'
                echo 'No tests configured yet'
            }
        }
    }
    
    post {
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}
