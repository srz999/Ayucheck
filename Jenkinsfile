pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS'  // This name must match the NodeJS installation name in Jenkins Global Tool Configuration
    }
    
    environment {
        // Prevent Next.js telemetry during CI
        NEXT_TELEMETRY_DISABLED = '1'
        // Set Node environment
        NODE_ENV = 'production'
    }
    
    stages {
        stage('Verify Environment') {
            steps {
                echo 'Verifying Node.js and npm installation...'
                script {
                    sh '''
                        echo "=== Node.js Information ==="
                        which node || echo "Node.js not found in PATH"
                        node --version || echo "Node.js version check failed"
                        
                        echo ""
                        echo "=== npm Information ==="
                        which npm || echo "npm not found in PATH"
                        npm --version || echo "npm version check failed"
                        
                        echo ""
                        echo "=== PATH ==="
                        echo $PATH
                        
                        echo ""
                        echo "=== Workspace ==="
                        pwd
                    '''
                }
            }
        }
        
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
