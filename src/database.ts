import pg = require('pg'); // PostgreSQL (PG) database interface
import pgFormat = require('pg-format'); // Query formatter for batch inserts

export const pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file

export async function addUser(email, githubUsername, accessToken) {
    const userId = await getUserId(githubUsername)
    if (!userId) {
        const rows = await executeQuery('INSERT INTO public.users (email_address, github_username, first_login_date, access_token) VALUES ($1, $2, NOW(), $3) RETURNING id', [email, githubUsername, accessToken])
        console.log('User created')
        return rows[0].id
    } else {
        console.log('User already exists')
        let rows = await executeQuery('UPDATE public.users SET access_token = ($1) WHERE id = ($2)', [accessToken, userId])

    }
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
    if (rows.length) return rows[0].id
}

export async function getRepoId(userId, repoName) {
    const rows = await executeQuery('SELECT * FROM public.repos WHERE user_id=$1 AND name=$2', [userId, repoName])
    if (rows.length) return rows[0].id
}

export async function getFileId(userId, repoId, fileName) {
    const rows = await executeQuery('SELECT * FROM public.files WHERE user_id=$1 AND repo_id=$2 AND name=$3', [userId, repoId, fileName])
    if (rows.length) return rows[0].id
}

/**
 * Return files that need to be notified from repos that are being watched
 * @param githubUsername 
 */
export async function getFilesToNotify(githubUsername) {
    const userId = await getUserId(githubUsername)
    const rows = await executeQuery(`
    SELECT files.id, files.name AS "fileName", files.last_contributors AS "contributors", repos.name AS "repoName" 
    FROM public.files 
    JOIN public.repos ON(files.repo_id = repos.id) 
    WHERE files.need_to_notify=true AND files.user_id=$1 AND repos.is_watching=true
    ORDER BY repos.name`, [userId])

    return rows
}

/**
 * Return issues that need to be notified from repos that are being watched
 * @param githubUsername 
 */
export async function getIssuesToNotify(githubUsername) {
    const userId = await getUserId(githubUsername)
    const rows = await executeQuery(`
    SELECT issues.id, issues.name AS "issue", issues.opened_by AS "openedBy", repos.name AS "repoName"
    FROM public.issues
    JOIN public.repos ON(issues.repo_id = repos.id)
    WHERE issues.need_to_notify=true AND issues.user_id=$1 AND repos.is_watching=true
    ORDER BY repos.name`, [userId])

    return rows
}
export async function addRepos(repos: Repo[], userId: string) {
    console.log("*** Add repos ***")

    // Identify any repos that are not currently in the database and only insert those

    const existingReposUrls = (await executeQuery('SELECT url FROM public.repos WHERE user_id=$1', [userId])).map(({ url }) => url)

    const newRepos = repos
        .filter(({ url }) => !existingReposUrls.includes(url))
        .map(({ name, url, description }) => ([name, userId, url, description]))

    if (newRepos.length) {
        const batchInsert = pgFormat('INSERT INTO public.repos (name, user_id, url, description) VALUES %L RETURNING id', newRepos)
        console.log(`Saved ${newRepos.length} new repos.`)
        const rows = await executeQuery(batchInsert, [])
        // Return IDs of the newly saved repos
        return rows.map(({ id }) => id)
    } else {
        console.log(`No new repos to save.`)
        return []
    }
}

export async function getReposForUser(userId: string) {
    console.log("*** Get repos ***")
    return await executeQuery('SELECT * FROM public.repos WHERE user_id=$1', [userId])
}

export async function getReposToNotify(githubUsername) {
    let userId = await getUserId(githubUsername)
    if (userId) {
        let rows = await executeQuery('SELECT * FROM public.repos WHERE user_id=$1 AND need_to_notify=true', [userId])
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
            console.log("File already exists")
        }
    } else {
        console.log("Cannot find the user or repo in the database")
    }
}

/**
 * Stores frequency in database. (Currently in public.users, in the email_frequency column)
 *
 * @param githubUsername
 * @param frequency - currently just a string in the set {'never', 'individual', 'daily', 'weekly'}
 */
export async function setEmailFrequency(githubUsername, frequency) {
    const userId = await getUserId(githubUsername)
    if (userId) {
        let rows = await executeQuery('UPDATE public.users SET email_frequency = ($1) WHERE id = ($2)', [frequency, userId])
    } else {
        console.log("Cannot find the user in the database")
    }
}

export async function getEmailFrequency(githubUsername) {
    const userId = await getUserId(githubUsername)
    if (userId) {
        let rows = await executeQuery('SELECT email_frequency FROM public.users WHERE id = ($1)', [userId])
        return rows[0].email_frequency
    } else {
        console.log("Cannot find the user in the database")
    }
}

export async function addIssue(issueData, githubUsername, repoName) {
    const userId = await getUserId(githubUsername)
    const repoId = await getRepoId(userId, repoName);
    const issueId = await getIssueId(userId, issueData.url)
    console.log(issueData)
    if (!issueId) {
        const rows = await executeQuery('INSERT INTO public.issues (user_id, repo_id, name, opened_by, url) VALUES ($1, $2, $3, $4, $5) RETURNING id', [userId, repoId, issueData.title, issueData.createdBy, issueData.url])
        console.log('issue added to database')
        return rows[0].id
    } else {
        await executeQuery('UPDATE public.issues SET opened_by = ($1) WHERE id = ($2)', [issueData.createdBy, issueId])
    }
}

export async function getIssueId(userId, url) {
    const rows = await executeQuery('SELECT * FROM public.issues WHERE user_id=$1 AND url=$2', [userId, url])
    if (rows.length) return rows[0].id
}
