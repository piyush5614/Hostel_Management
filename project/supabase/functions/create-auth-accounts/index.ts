import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error("Missing Supabase configuration");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@^2");
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const accounts = [
      {
        email: "admin@tchostel.edu",
        password: "Admin@123456",
        name: "System Administrator",
        role: "admin",
      },
      {
        email: "warden@tchostel.edu",
        password: "Warden@123456",
        name: "Dr. Priya Sharma",
        role: "warden",
      },
      {
        email: "rajesh.kumar@tchostel.edu",
        password: "Staff@123456",
        name: "Rajesh Kumar",
        role: "staff",
      },
      {
        email: "anita.singh@tchostel.edu",
        password: "Staff@123456",
        name: "Anita Singh",
        role: "staff",
      },
      {
        email: "vikram.patel@tchostel.edu",
        password: "Staff@123456",
        name: "Vikram Patel",
        role: "staff",
      },
      {
        email: "meera.gupta@tchostel.edu",
        password: "Staff@123456",
        name: "Meera Gupta",
        role: "staff",
      },
      {
        email: "arjun.nair@tchostel.edu",
        password: "Staff@123456",
        name: "Arjun Nair",
        role: "staff",
      },
    ];

    const studentAccounts = [
      { email: "aarav.singh@tchostel.edu", name: "Aarav Singh" },
      { email: "bhavna.gupta@tchostel.edu", name: "Bhavna Gupta" },
      { email: "chirag.patel@tchostel.edu", name: "Chirag Patel" },
      { email: "divya.nair@tchostel.edu", name: "Divya Nair" },
      { email: "eshan.kumar@tchostel.edu", name: "Eshan Kumar" },
      { email: "fatima.ahmed@tchostel.edu", name: "Fatima Ahmed" },
      { email: "gaurav.reddy@tchostel.edu", name: "Gaurav Reddy" },
      { email: "harshita.verma@tchostel.edu", name: "Harshita Verma" },
      { email: "ishaan.malhotra@tchostel.edu", name: "Ishaan Malhotra" },
      { email: "jyoti.sharma@tchostel.edu", name: "Jyoti Sharma" },
      { email: "karan.desai@tchostel.edu", name: "Karan Desai" },
      { email: "leena.iyer@tchostel.edu", name: "Leena Iyer" },
      { email: "mohit.jain@tchostel.edu", name: "Mohit Jain" },
      { email: "neha.kapoor@tchostel.edu", name: "Neha Kapoor" },
      { email: "omkar.pawar@tchostel.edu", name: "Omkar Pawar" },
      { email: "priya.bansal@tchostel.edu", name: "Priya Bansal" },
      { email: "qasim.khan@tchostel.edu", name: "Qasim Khan" },
      { email: "ravi.mehta@tchostel.edu", name: "Ravi Mehta" },
      { email: "sneha.roy@tchostel.edu", name: "Sneha Roy" },
      { email: "tushar.sinha@tchostel.edu", name: "Tushar Sinha" },
    ];

    const password = "Student@123456";
    const createdAccounts = [];
    const errors = [];

    for (const account of accounts) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            name: account.name,
            role: account.role,
          },
        });

        if (error) {
          errors.push(`${account.email}: ${error.message}`);
        } else {
          createdAccounts.push({
            email: account.email,
            name: account.name,
            role: account.role,
            id: data?.user?.id,
          });
        }
      } catch (e) {
        errors.push(`${account.email}: ${String(e)}`);
      }
    }

    for (const student of studentAccounts) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: student.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: student.name,
            role: "student",
          },
        });

        if (error) {
          errors.push(`${student.email}: ${error.message}`);
        } else {
          createdAccounts.push({
            email: student.email,
            name: student.name,
            role: "student",
            id: data?.user?.id,
          });
        }
      } catch (e) {
        errors.push(`${student.email}: ${String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: createdAccounts.length,
        accounts: createdAccounts,
        errors: errors,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
