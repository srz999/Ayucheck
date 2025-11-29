pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS'  // Make sure to configure NodeJS in Jenkins Global Tool Configuration
    }
    
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
                bat 'npm ci'  // Use 'sh npm ci' for Linux/Mac agents
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running lint checks...'
                bat 'npm run lint'  // Use 'sh npm run lint' for Linux/Mac agents
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building Next.js application...'
                bat 'npm run build'  // Use 'sh npm run build' for Linux/Mac agents
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                // Uncomment when you have tests configured
                // bat 'npm test'  // Use 'sh npm test' for Linux/Mac agents
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
