import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export interface MenuItem {
  title: string;
  href: string;
}

export interface MenuColumn {
  title: string;
  items: MenuItem[];
}

export interface MegaMenuData {
  columns: MenuColumn[];
}

export interface NavigationItem {
  title: string;
  href: string;
  megaMenu?: MegaMenuData;
}

export interface MenuData {
  navigation: NavigationItem[];
}

export class MegaMenuService {
  private spHttpClient: SPHttpClient;
  private baseUrl: string;
  private documentLibrary: string;
  private fileName: string;
  private cacheKey: string = 'spfx-mega-menu-data';
  private cacheExpiry: number = 30 * 60 * 1000; // 30 minutes

  constructor(
    spHttpClient: SPHttpClient,
    baseUrl: string,
    documentLibrary: string = 'Shared Documents',
    fileName: string = 'menuData.ts'
  ) {
    this.spHttpClient = spHttpClient;
    this.baseUrl = baseUrl;
    this.documentLibrary = documentLibrary;
    this.fileName = fileName;
  }

  public async getMenuData(): Promise<MenuData> {
    // Try cache first
    const cached = this.getCachedMenuData();
    if (cached) {
      console.log('Using cached menu data');
      return cached;
    }

    try {
      console.log(`Fetching menu data from: ${this.documentLibrary}/${this.fileName}`);
      
      // Try primary method first
      const data = await this.fetchMenuDataFile();
      this.cacheMenuData(data);
      console.log('Successfully fetched and cached menu data');
      return data;
    } catch (error) {
      console.warn('Primary fetch method failed, trying alternative:', error);
      
      try {
        // Try alternative method
        const data = await this.fetchMenuDataFileAlternative();
        this.cacheMenuData(data);
        console.log('Successfully fetched menu data using alternative method');
        return data;
      } catch (alternativeError) {
        console.error('Both fetch methods failed:', alternativeError);
        
        // Return fallback data
        console.log('Using fallback menu data');
        return this.getFallbackMenuData();
      }
    }
  }

  private async fetchMenuDataFile(): Promise<MenuData> {
    // Construct the SharePoint REST API endpoint to get file content
    const endpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;
    
    console.log('Fetching from endpoint:', endpoint);

    const response: SPHttpClientResponse = await this.spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`SharePoint Document Library error: ${response.status} ${response.statusText}`);
    }

    const fileContent = await response.text();
    console.log('Raw file content received:', fileContent.substring(0, 200) + '...');
    
    return this.parseMenuDataFromFile(fileContent);
  }

  private async fetchMenuDataFileAlternative(): Promise<MenuData> {
    // Alternative method: Get file information first, then content
    const fileInfoEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')`;
    
    console.log('Getting file info from:', fileInfoEndpoint);
    
    const fileInfoResponse: SPHttpClientResponse = await this.spHttpClient.get(
      fileInfoEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!fileInfoResponse.ok) {
      throw new Error(`File not found: ${fileInfoResponse.status} ${fileInfoResponse.statusText}`);
    }

    const fileInfo = await fileInfoResponse.json();
    console.log('File info received:', fileInfo);

    // Get file content using the server relative URL
    const contentEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('${fileInfo.ServerRelativeUrl}')/$value`;
    
    console.log('Getting file content from:', contentEndpoint);
    
    const contentResponse: SPHttpClientResponse = await this.spHttpClient.get(
      contentEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch file content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const fileContent = await contentResponse.text();
    console.log('File content received via alternative method');
    
    return this.parseMenuDataFromFile(fileContent);
  }

  private parseMenuDataFromFile(fileContent: string): MenuData {
    try {
      console.log('Parsing menuData.ts file content...');
      
      // Clean up the TypeScript file content
      let cleanContent = fileContent.trim();
      
      // Remove comments (both single-line and multi-line)
      cleanContent = cleanContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments
      
      // Remove import statements
      cleanContent = cleanContent.replace(/^import.*?;?\s*$/gm, '');
      
      // Remove interface and type definitions
      cleanContent = cleanContent.replace(/^(export\s+)?(interface|type)\s+\w+.*?(?=^(export|interface|type|\w+\s*[=:])|$)/gms, '');
      
      // Find the export const menuData declaration
      const exportMatch = cleanContent.match(/export\s+const\s+menuData\s*=\s*([\s\S]*?)(?:;?\s*$)/m);
      
      if (!exportMatch) {
        throw new Error('Could not find "export const menuData" declaration in file');
      }
      
      let dataString = exportMatch[1].trim();
      
      // Remove trailing semicolon if present
      dataString = dataString.replace(/;$/, '');
      
      console.log('Extracted data string:', dataString.substring(0, 200) + '...');
      
      // Convert TypeScript/JavaScript object notation to valid JSON
      const jsonString = this.convertToValidJSON(dataString);
      
      console.log('Converted to JSON format');
      
      // Parse the JSON
      const parsedData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Parsed data is not a valid object');
      }
      
      if (!parsedData.navigation || !Array.isArray(parsedData.navigation)) {
        throw new Error('Invalid menu data structure: missing or invalid navigation array');
      }
      
      console.log('Successfully parsed menu data with', parsedData.navigation.length, 'navigation items');
      
      return parsedData as MenuData;
      
    } catch (error) {
      console.error('Error parsing menuData.ts file:', error);
      console.log('Full file content for debugging:', fileContent);
      throw new Error(`Failed to parse menu data file: ${error.message}`);
    }
  }

  private convertToValidJSON(dataString: string): string {
    // Handle object property names (add quotes if not already quoted)
    let jsonString = dataString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Convert single quotes to double quotes, but be careful with escaped quotes
    jsonString = jsonString.replace(/'/g, '"');
    
    // Handle trailing commas (remove them)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Handle functions or undefined values (replace with null)
    jsonString = jsonString.replace(/:\s*undefined\b/g, ': null');
    
    // Handle boolean values (ensure they're lowercase)
    jsonString = jsonString.replace(/:\s*True\b/g, ': true');
    jsonString = jsonString.replace(/:\s*False\b/g, ': false');
    
    return jsonString;
  }

  private getFallbackMenuData(): MenuData {
    return {
      navigation: [
        {
          title: "My Sites",
          href: "",
          megaMenu: {
            columns: [
              {
                title: "",
                items: [
                  { title: "Academic Affairs Staff Workspace", href: "/sites/academicaffairsworkspace" },
                  { title: "Adjunct Faculty Workspace", href: "/sites/adjunctfacultyworkspace" },
                  { title: "Admitted J.D. Student Portal", href: "/sites/admittedjdstudentportal" },
                  { title: "Bar Exam Info", href: "/sites/barexaminfo" },
                  { title: "Bar Exam Results", href: "/sites/barexamresults" },
                  { title: "CJEC Post Grad Judicial Clerkship for J.D. Students and Alumni", href: "/sites/postgraduatejudicialclerkships" },
                  { title: "CJEC Workspace for Administrators", href: "/sites/cjecworkspace" },
                  { title: "Climate and Sustainability", href: "/sites/clesi" },
                  { title: "Clinic Staff and Faculty Workspace", href: "/sites/clinicstaffandfacultyworkspace" },
                  { title: "Clinics", href: "/sites/clinics" },
                  { title: "CMS Workspace", href: "/sites/cms" },
                  { title: "Course Evaluations", href: "/sites/courseevaluations" },
                  { title: "CPC Career Services for Current J.D. Students", href: "/sites/careerservicesforcurrentjdstudents" },
                  { title: "CPC Career Services for Current J.D. Students", href: "/sites/careerservicesforcurrentjdstudents_old" }
                ]
              },
              {
                title: "",
                items: [
                  { title: "CPC Career Services for J.D. Alumni", href: "/sites/careerservicesforjdalumni" },
                  { title: "CPC Career Services for J.D. Alumni", href: "/sites/careerservicesforjdalumni_old" },
                  { title: "CPC Staff Workspace", href: "/sites/cpcworkspace" },
                  { title: "DAUR Staff Workspace", href: "/sites/developmentworkspace" },
                  { title: "Disability Services", href: "/sites/disabilityservices" },
                  { title: "ELR Volume 34 Workspace (deactivated)", href: "/sites/elrvolume34" },
                  { title: "ELR Volume 33 Workspace", href: "/sites/elrvolume33" },
                  { title: "Event Planning", href: "/sites/eventplanning" },
                  { title: "Exam Schedules", href: "/sites/examschedules" },
                  { title: "Exam4 Registration, Proctoring, and Scheduling App", href: "/sites/erpsa" },
                  { title: "Examinations", href: "/sites/examinations" },
                  { title: "Externship Evaluations", href: "/sites/externshipevaluations" },
                  { title: "Faculty Connect", href: "/sites/facultyconnect" },
                  { title: "Faculty Support Workspace", href: "/sites/facultysupport" }
                ]
              },
              {
                title: "",
                items: [
                  { title: "Financial Aid Resources", href: "/sites/financialaidresources" },
                  { title: "Financial Aid Staff Workspace", href: "/sites/financialaidworkspace" },
                  { title: "Flex Time Manager", href: "/sites/comptimemanager" },
                  { title: "Forms Central", href: "/sites/formscentral" },
                  { title: "Full-time Faculty Workspace", href: "/sites/fulltimefacultyworkspace" },
                  { title: "Fundamental Lawyering Skills", href: "/sites/fundamentallawyeringskills" },
                  { title: "Grading", href: "/sites/grading" },
                  { title: "Graduate Programs (LL.M., M.S.L., S.J.D.)", href: "/sites/nonjdstudentresources" },
                  { title: "Help Desk Staff Workspace", href: "/sites/helpdeskworkspace" },
                  { title: "House 1/2", href: "/sites/house1-2" },
                  { title: "House 3/4", href: "/sites/house3-4" },
                  { title: "House 5/6", href: "/sites/house5-6" },
                  { title: "House 7/8", href: "/sites/house7-8" },
                  { title: "House 9 (Evening Division)", href: "/sites/house-evedivision" },
                  { title: "House 9/10 (deactivated)", href: "/sites/house9-10" },
                  { title: "ILJ Volume 45 Workspace", href: "/sites/iljvolume45" }
                ]
              },
              {
                title: "",
                items: [
                  { title: "ILJ Volume 46 Workspace", href: "/sites/iljvolume46" },
                  { title: "ILJ Volume 47 Workspace", href: "/sites/iljvolume47" },
                  { title: "ILJ Volume 48 Workspace", href: "/sites/iljvolume48" },
                  { title: "International Programs Staff Workspace", href: "/sites/internationalprogramsworkspace" },
                  { title: "IPLJ Volume XXXII Workspace (deactivated)", href: "/sites/ipljvolumexxxii" },
                  { title: "IPLJ Volume XXXIII Workspace (deactivated)", href: "/sites/ipljvolumexxxiii" },
                  { title: "J.D. Admissions Staff Workspace", href: "/sites/jdadmissionsworkspace" },
                  { title: "J.D. Concentrations", href: "/sites/jdconcentrations" },
                  { title: "J.D. Curriculum Guide", href: "/sites/jdcurriculumguide" },
                  { title: "J.D. Externships", href: "/sites/jdexternships" },
                  { title: "J.D. Graduation Audit", href: "/sites/jdgraduationaudit" },
                  { title: "JCFL Volume XXIX Workspace", href: "/sites/jcflvolumexxix" },
                  { title: "JCFL Volume XXVII Workspace", href: "/sites/jcflvolumexxvii" },
                  { title: "JCFL Volume XXVIII Workspace", href: "/sites/jcflvolumexxviii" }
                ]
              },
              {
                title: "",
                items: [
                  { title: "JCFL Volume XXX Workspace", href: "/sites/jcflvolumexxx" },
                  { title: "Legal English Institute (deactivated)", href: "/sites/legalenglishinstitute" },
                  { title: "Legal Writing and Lawyering Staff Workspace", href: "/sites/legalwritingworkspace" },
                  { title: "Marcomm Staff Workspace", href: "/sites/marcomstaffworkspace" },
                  { title: "Mental Health and Wellness Resources", href: "/sites/mentalhealthandwellness" },
                  { title: "Named Scholarships Workspace", href: "/sites/namedscholarships" },
                  { title: "Office of Finance Staff Workspace", href: "/sites/financeworkspace" },
                  { title: "Office of Professionalism", href: "/sites/professionalism" },
                  { title: "Office of Student Affairs Staff Workspace", href: "/sites/officeofstudentaffairsworkspace" },
                  { title: "OPP Staff Workspace", href: "/sites/oppworkspace" },
                  { title: "PIRC Staff Workspace", href: "/sites/pircstaffworkspace" },
                  { title: "Pro Bono Scholars Program", href: "/sites/probonoscholarsprogram" },
                  { title: "Professionalism Staff Workspace", href: "/sites/professionalismstaff" },
                  { title: "Public Interest Resource Center", href: "/sites/publicinterestresourcecenter" },
                  { title: "Public Interest Resource Center", href: "/sites/publicinterestresourcecenter_old" }
                ]
              }
            ]
          }
        },
        {
          title: "Forms Central",
          href: "/sites/formscentral"
        },
        {
          title: "Library",
          href: "https://library.law.fordham.edu/"
        },
        {
          title: "Apps",
          href: "",
          megaMenu: {
            columns: [
              {
                title: "Global apps",
                items: [
                  { title: "25 Live", href: "https://25live.collegenet.com/25live/data/fordham/run/login.shibboleth?redirect=https://25live.collegenet.com/fordham/" },
                  { title: "Blackboard", href: "https://fordham.blackboard.com/" },
                  { title: "Canva", href: "/SitePages/Canva.aspx?web=1" },
                  { title: "Echo360", href: "http://bit.ly/3pcUJWh" },
                  { title: "Fordham U Apps", href: "https://www.fordham.edu/my-apps/" },
                  { title: "GMail", href: "https://gmail.fordham.edu/" },
                  { title: "Google Drive", href: "https://drive.google.com/a/fordham.edu" },
                  { title: "Grammarly", href: "https://www.grammarly.com/enterprise/signup" },
                  { title: "Microsoft Office 365", href: "https://login.microsoftonline.com/login.srf?wa=wsignin1.0&amp%3bwhr=fordham.edu" },
                  { title: "Power BI", href: "https://app.powerbi.com/" },
                  { title: "Qualtrics", href: "https://fordham.qualtrics.com/" },
                  { title: "Seating Charts", href: "https://zdapi.appointlink.com/ZDConvert/AutoLaunch/2990/0/0/x7fg/login=shib%7cidp=https:%28s%29%28s%29loginp.fordham.edu%28s%29idp%28s%29shibboleth%7czdapp=zd" },
                  { title: "TWEN", href: "https://lawschool.thomsonreuters.com/ls-login.php" },
                  { title: "Web Print Portal", href: "https://print.fordham.edu/" }
                ]
              },
              {
                title: "Academic apps",
                items: [
                  { title: "Anonymous Course Evaluations", href: "/sites/courseevaluations" },
                  { title: "Bookstore", href: "https://urldefense.proofpoint.com/v2/url?u=https-3A__sso.bncollege.com_bes-2Dsp_bessso_saml_fordhamedu_aip_logon&d=DwMF-g&c=aqMfXOEvEJQh2iQMCb7Wy8l0sPnURkcqADc2guUW8IM&r=0d_-pEHmOTsg1xcUtiEH_76ojRaVa2Ag-v8ew8GAJxg&m=dEBVCNKNONg5RrRMPc3Mf3Pqjti0eG_FTKB0cQaSnuw&s=19DiuVpjLa9ttsjIgm2eMN4-y94mLc2Q9Lle4Y6Q5cM&e=" },
                  { title: "Class Schedules", href: "https://myweb.lawnet.fordham.edu/sites/classschedules" },
                  { title: "Course Syllabi and First Assignments", href: "/SitePages/Course-Syllabi-and-First-Assignments.aspx" },
                  { title: "Examinations (Exam4)", href: "/sites/examinations" }
                ]
              },
              {
                title: "Student apps",
                items: [
                  { title: "Faculty Connect", href: "/SitePages/Faculty-Connect.aspx" },
                  { title: "Lockers", href: "/SitePages/Student-Lockers.aspx?web=1" },
                  { title: "My Bill Suite", href: "http://bit.ly/2GB2wZw" },
                  { title: "Student Registration", href: "https://reg-prod.ec.fordham.edu/StudentRegistrationSsb/ssb/registration" },
                  { title: "Student Services", href: "https://studentssb-prod.ec.fordham.edu/StudentSelfService" }
                ]
              },
              {
                title: "Staff apps",
                items: [
                  { title: "Employee Services", href: "https://www.fordham.edu/my-pages/employee" },
                  { title: "Clerkship Database", href: "/sites/clerkship/SitePages/Clerkship-Applicants.aspx" },
                  { title: "Clerskship Interview Feedback", href: "/sites/cjecworkspace/SitePages/Interview-Feedback-Admin.aspx" },
                  { title: "Course Tools", href: "/SitePages/Course-Tools.aspx" }
                ]
              }
            ]
          }
        },
        {
          title: "IT Support Portal",
          href: "https://fordhamlaw.freshservice.com/support/home"
        }
      ]
    };
  }

  private cacheMenuData(data: MenuData): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.cacheExpiry
    };
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('Menu data cached successfully');
    } catch (error) {
      console.warn('Failed to cache menu data:', error);
    }
  }

  private getCachedMenuData(): MenuData | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) {
        console.log('No cached menu data found');
        return null;
      }

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(this.cacheKey);
        console.log('Cached menu data expired, removed from cache');
        return null;
      }

      console.log('Found valid cached menu data');
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached menu data:', error);
      localStorage.removeItem(this.cacheKey); // Clean up corrupted cache
      return null;
    }
  }
}