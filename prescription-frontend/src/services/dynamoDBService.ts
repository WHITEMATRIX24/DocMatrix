// src/services/dynamoDBService.ts - Updated for Vite with correct method signatures
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { Patient } from '../types';

class DynamoDBService {
  updatePatient(patientData: Patient) {
    throw new Error('Method not implemented.');
  }
  private docClient: DynamoDBDocumentClient | null = null;
  
  // Use VITE_ prefix for environment variables
  private region = import.meta.env.VITE_AWS_REGION;
  private identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID;
  
  // Table names from environment variables
  private prescriptionsTable = import.meta.env.VITE_PRESCRIPTIONS_TABLE;
  private patientsTable = import.meta.env.VITE_PATIENTS_TABLE;
  private medicinesTable = import.meta.env.VITE_MEDICINES_TABLE;
  private usersTable = import.meta.env.VITE_USERS_TABLE;

  private async getClient(): Promise<DynamoDBDocumentClient> {
    if (!this.docClient) {
      if (!this.identityPoolId) {
        throw new Error('Cognito Identity Pool ID not configured. Check VITE_IDENTITY_POOL_ID in .env');
      }

      console.log('🔧 Initializing DynamoDB client with:', {
        region: this.region,
        identityPoolId: this.identityPoolId,
        tables: {
          prescriptions: this.prescriptionsTable,
          patients: this.patientsTable,
          medicines: this.medicinesTable,
          users: this.usersTable
        }
      });

      const client = new DynamoDBClient({
        region: this.region,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: this.region },
          identityPoolId: this.identityPoolId,
          // For unauthenticated access - no logins needed
        }),
      });

      this.docClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          convertEmptyValues: false,
          removeUndefinedValues: true,
          convertClassInstanceToMap: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
    }
    return this.docClient;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.getClient();
      
      console.log('🧪 Testing DynamoDB connection...');
      
      // Test each table
      const tablesToTest = [
        { name: 'Prescriptions', tableName: this.prescriptionsTable },
        { name: 'Patients', tableName: this.patientsTable },
        { name: 'Medicines', tableName: this.medicinesTable },
        { name: 'Users', tableName: this.usersTable }
      ].filter(table => table.tableName);

      let accessibleTables = 0;
      const errors: string[] = [];

      for (const table of tablesToTest) {
        try {
          console.log(`🔍 Testing table: ${table.tableName}`);
          
          await client.send(new ScanCommand({
            TableName: table.tableName,
            Limit: 1
          }));
          
          accessibleTables++;
          console.log(`✅ ${table.name} table accessible`);
        } catch (error: any) {
          const errorMsg = `${table.name}: ${error.message}`;
          errors.push(errorMsg);
          console.log(`❌ ${table.name} table failed: ${error.message}`);
        }
      }

      if (accessibleTables === 0) {
        return {
          success: false,
          message: `DynamoDB connection test: ${accessibleTables}/${tablesToTest.length} tables accessible. Errors: ${errors.join(', ')}`
        };
      }

      return {
        success: true,
        message: `DynamoDB connection successful: ${accessibleTables}/${tablesToTest.length} tables accessible`
      };
    } catch (error: any) {
      console.error('❌ DynamoDB connection test failed:', error);
      return {
        success: false,
        message: `DynamoDB connection failed: ${error.message}`
      };
    }
  }

  // Prescriptions methods
  async getAllPrescriptions(): Promise<any[]> {
    try {
      const client = await this.getClient();
      console.log(`📋 Getting all prescriptions from table: ${this.prescriptionsTable}`);
      
      const command = new ScanCommand({
        TableName: this.prescriptionsTable,
      });

      const response = await client.send(command);
      console.log(`📋 Found ${response.Items?.length || 0} prescriptions`);
      return response.Items || [];
    } catch (error: any) {
      console.error('❌ Error getting prescriptions:', error);
      throw new Error(`Failed to get prescriptions: ${error.message}`);
    }
  }

  async getPrescription(prescriptionId: string): Promise<any | null> {
    try {
      const client = await this.getClient();
      console.log(`🔍 Getting prescription: ${prescriptionId}`);
      
      const command = new GetCommand({
        TableName: this.prescriptionsTable,
        Key: {
          prescriptionId: prescriptionId
        }
      });

      const response = await client.send(command);
      return response.Item || null;
    } catch (error: any) {
      console.error('❌ Error getting prescription:', error);
      throw new Error(`Failed to get prescription: ${error.message}`);
    }
  }

  // CREATE PRESCRIPTION (single argument) - FIXED METHOD
  async createPrescription(prescriptionData: any): Promise<any> {
    try {
      const client = await this.getClient();
      console.log(`➕ Creating prescription: ${prescriptionData.prescriptionId}`);
      
      const command = new PutCommand({
        TableName: this.prescriptionsTable,
        Item: {
          ...prescriptionData,
          createdAt: prescriptionData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await client.send(command);
      console.log(`✅ Prescription created successfully`);
      return prescriptionData;
    } catch (error: any) {
      console.error('❌ Error creating prescription:', error);
      throw new Error(`Failed to create prescription: ${error.message}`);
    }
  }

  // UPDATE PRESCRIPTION (for editing existing prescriptions) - NEW METHOD
  async updatePrescription(prescriptionId: string, updateData: any): Promise<any> {
    try {
      const client = await this.getClient();
      console.log(`📝 Updating prescription: ${prescriptionId}`);
      
      // First get the existing prescription
      const existingPrescription = await this.getPrescription(prescriptionId);
      if (!existingPrescription) {
        throw new Error('Prescription not found');
      }

      // Merge the updates with existing data
      const updatedPrescription = {
        ...existingPrescription,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      const command = new PutCommand({
        TableName: this.prescriptionsTable,
        Item: updatedPrescription
      });

      await client.send(command);
      console.log(`✅ Prescription updated successfully`);
      return updatedPrescription;
    } catch (error: any) {
      console.error('❌ Error updating prescription:', error);
      throw new Error(`Failed to update prescription: ${error.message}`);
    }
  }

  // Patients methods
  async getAllPatients(): Promise<any[]> {
    try {
      const client = await this.getClient();
      console.log(`👥 Getting all patients from table: ${this.patientsTable}`);
      
      const command = new ScanCommand({
        TableName: this.patientsTable,
      });

      const response = await client.send(command);
      console.log(`👥 Found ${response.Items?.length || 0} patients`);
      return response.Items || [];
    } catch (error: any) {
      console.error('❌ Error getting patients:', error);
      throw new Error(`Failed to get patients: ${error.message}`);
    }
  }

  async getPatient(patientId: string): Promise<any | null> {
    try {
      const client = await this.getClient();
      console.log(`🔍 Getting patient: ${patientId}`);
      
      const command = new GetCommand({
        TableName: this.patientsTable,
        Key: {
          patientId: patientId
        }
      });

      const response = await client.send(command);
      return response.Item || null;
    } catch (error: any) {
      console.error('❌ Error getting patient:', error);
      throw new Error(`Failed to get patient: ${error.message}`);
    }
  }

  async createPatient(patient: any): Promise<any> {
    try {
      const client = await this.getClient();
      console.log(`➕ Creating patient: ${patient.patientId}`);
      
      const command = new PutCommand({
        TableName: this.patientsTable,
        Item: {
          ...patient,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await client.send(command);
      console.log(`✅ Patient created successfully`);
      return patient;
    } catch (error: any) {
      console.error('❌ Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error.message}`);
    }
  }

  // SEARCH PATIENTS (for autocomplete) - IMPLEMENTED METHOD
  async searchPatients(searchTerm: string): Promise<any[]> {
    try {
      const allPatients = await this.getAllPatients();
      const filtered = allPatients.filter((patient: any) => {
        if (!patient || !patient.name) return false;
        return patient.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
      return filtered.slice(0, 10); // Limit results
    } catch (error: any) {
      console.error('❌ Error searching patients:', error);
      throw new Error(`Failed to search patients: ${error.message}`);
    }
  }

  // Medicines methods
  async getAllMedicines(): Promise<any[]> {
    try {
      const client = await this.getClient();
      console.log(`💊 Getting all medicines from table: ${this.medicinesTable}`);
      
      const command = new ScanCommand({
        TableName: this.medicinesTable,
      });

      const response = await client.send(command);
      console.log(`💊 Found ${response.Items?.length || 0} medicines`);
      return response.Items || [];
    } catch (error: any) {
      console.error('❌ Error getting medicines:', error);
      throw new Error(`Failed to get medicines: ${error.message}`);
    }
  }

  async getMedicine(medicineId: string): Promise<any | null> {
    try {
      const client = await this.getClient();
      console.log(`🔍 Getting medicine: ${medicineId}`);
      
      const command = new GetCommand({
        TableName: this.medicinesTable,
        Key: {
          medicineId: medicineId
        }
      });

      const response = await client.send(command);
      return response.Item || null;
    } catch (error: any) {
      console.error('❌ Error getting medicine:', error);
      throw new Error(`Failed to get medicine: ${error.message}`);
    }
  }

  async createMedicine(medicine: any): Promise<any> {
    try {
      const client = await this.getClient();
      console.log(`➕ Creating medicine: ${medicine.medicineId}`);
      
      const command = new PutCommand({
        TableName: this.medicinesTable,
        Item: {
          ...medicine,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      await client.send(command);
      console.log(`✅ Medicine created successfully`);
      return medicine;
    } catch (error: any) {
      console.error('❌ Error creating medicine:', error);
      throw new Error(`Failed to create medicine: ${error.message}`);
    }
  }

  // Dashboard stats (calculated from data)
  async getDashboardStats(): Promise<any> {
    try {
      // This method now just throws an error to force manual calculation
      // since it was causing authentication issues
      throw new Error('Dashboard stats calculation moved to client-side');
    } catch (error: any) {
      console.warn('⚠️ Dashboard stats not available, will calculate manually');
      throw error;
    }
  }

  // Utility method to test individual table access
  async testTableAccess(tableName: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.send(new ScanCommand({
        TableName: tableName,
        Limit: 1
      }));
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create and export singleton instance
export const dynamoDBService = new DynamoDBService();

// Also export the class for testing
export { DynamoDBService };