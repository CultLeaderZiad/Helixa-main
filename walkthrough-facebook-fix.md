# Facebook Connection Deep Fix

## The Issue
When connecting a Facebook page, the process succeeded on the server and saved the connection to the database. However, when the UI tried to fetch the list of connected platforms to display them, it requested a column named `created_at`, but the actual column in the Supabase database is `connected_at`. This caused the query to fail silently, resulting in an empty list and the UI continually showing "No Facebook Pages connected".

## The Fix
I updated the query in `app/api/user/connections/route.ts` to correctly request `connected_at`:

```diff
    const { data, error } = await supabase
      .from("platform_connections")
-     .select("id, platform, page_id, metadata, created_at")
+     .select("id, platform, page_id, metadata, connected_at")
      .eq("user_id", igUser.id)
```

## Result
Now, when you connect a Facebook page, it will correctly display in the Connected Platforms list. 

*Note regarding automations*: Currently, the Automations page (`/dashboard/automations`) is exclusively built for Instagram. If you'd like to build out the full Facebook automation rules engine (similar to Instagram's), that would be a large new feature to plan next!
