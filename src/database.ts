import pg = require('pg'); // PostgreSQL (PG) database interface

export const pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file

export async function addUser(email, githubUsername) {
    const userId = await getUserId(githubUsername)
    if (!userId) {
        const rows = await executeQuery('INSERT INTO public.users (email_address, github_username, first_login_date) VALUES ($1, $2, NOW()) RETURNING id', [email, githubUsername])
        console.log('User created')
        return rows[0].id
    } else {
        console.log('User already exist')
    }
    // pool.query('SELECT * FROM public.users WHERE email_address=$1 AND github_username=$2', [email, githubUsername], (err, queryRes) => {

    //   if (err) {
    //     console.log(err);
    //     return
    //   } else {
    //     console.log(queryRes.rows);
    //     // If user does not exist, create an account for them
    //     if (queryRes.rows.length) { // user exists already, get their ID?
    //       const { id } = queryRes.rows[0];
    //       return { id }
    //     } else { // user does not exist
    //       pool.query('INSERT INTO public.users (email_address, github_username, first_login_date) VALUES ($1, $2, NOW()) RETURNING id', [email, githubUsername], (err, queryRes2) => {

    //         if (err) {
    //           console.log(err);
    //           return
    //         } else {
    //           console.log("User created");
    //           const { id } = queryRes2.rows[0];
    //           return { id }
    //         }
    //       })
    //     }
    //   }
    // })
}

export async function executeQuery(queryString, listArgs) {
    try {
        const res = await pool.query(queryString, listArgs)
        const rows = <any[]>res.rows
        return rows
    } catch (err) {
        throw new Error(err)
    }
}

export async function getUserId(githubUsername) {
    const rows = await executeQuery('SELECT * FROM public.users WHERE github_username=$1', [githubUsername])
    if (rows.length)
        return rows[0].id
}

export async function getRepoId(userId, repoName) {
    const rows = await executeQuery('SELECT * FROM public.repos WHERE user_id=$1 AND name=$2', [userId, repoName])
    if (rows.length)
        return rows[0].id
}

export async function getFileId(userId, repoId, fileName) {
    const rows = await executeQuery('SELECT * FROM public.files WHERE user_id=$1 AND repo_id=$2 AND name=$3', [userId, repoId, fileName])
    if (rows.length)
        return rows[0].id
}

export async function addRepo(repo, githubUsername) {
    /**
     * Need user(id) to insert as FK
     * get user(id) from email and githubUsername
     */

    const userId = await getUserId(githubUsername)
    if (userId) {
        const repoId = await getRepoId(userId, repo.name);
        // console.log(repoId)
        if (!repoId) {
            const rows = await executeQuery('INSERT INTO public.repos (name, user_id, url, description) VALUES ($1, $2, $3, $4) RETURNING id', [repo.name, userId, repo.url, repo.description])
            console.log("New repo saved");
            return rows[0].id
        }
        else {
            console.log("Repo already exist")
            // TODO: may need to update info such as description
        }
    } else {
        console.log("Cannot find the user in the database")
    }
  }

  export async function getReposToNotify(githubUsername){
    let userId = await getUserId(githubUsername)
    if (userId) {
        let rows = await executeQuery('SELECT * FROM public.repos WHERE user_id=$1 AND need_to_notify=true',[userId])
        return rows
    }
  }
  
 export async function addFile(fileInfo, repoName, githubUsername) {
    const userId = await getUserId(githubUsername)
    const repoId = await getRepoId(userId, repoName);
    const fileId = await getFileId(userId, repoId, fileInfo.filename)
    if (userId && repoId) {
        if (!fileId) {
            // TODO: may need to save more data about the file like number of line changes
            let rows = await executeQuery('INSERT INTO public.files (name, user_id, repo_id) VALUES ($1, $2, $3) RETURNING id', [fileInfo.filename, userId, repoId])
            console.log("New file saved");
            return rows[0].id
        } else {
            console.log("File already exist")
        }
    } else {
        console.log("Cannot find the user or repo in the database")
    }
}

