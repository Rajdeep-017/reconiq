'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'


export function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Configure your organization and account preferences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>Manage your organization profile and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org_name">Organization Name</Label>
              <Input id="org_name" name="org_name" placeholder="My E-commerce Store" defaultValue="ReconIQ Demo Org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_slug">Organization Slug</Label>
              <Input id="org_slug" name="org_slug" placeholder="my-store" defaultValue="reconiq-demo-org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_email">Primary Contact Email</Label>
              <Input id="org_email" name="org_email" type="email" placeholder="admin@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_timezone">Time Zone</Label>
              <Input id="org_timezone" name="org_timezone" placeholder="Asia/Kolkata" defaultValue="Asia/Kolkata" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_currency">Default Currency</Label>
              <Input id="org_currency" name="org_currency" placeholder="INR" defaultValue="INR" />
            </div>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h3 className="font-medium">Two-Factor Authentication</h3>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h3 className="font-medium">Session Timeout</h3>
                <p className="text-xs text-muted-foreground">Automatic logout after inactivity.</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h3 className="font-medium">API Access</h3>
                <p className="text-xs text-muted-foreground">Manage API keys and integrations.</p>
              </div>
              <Button variant="outline" size="sm">Manage Keys</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-xs text-muted-foreground">Receive email alerts for reconciliation updates.</p>
            </div>
            <Button variant="outline" size="sm" className="relative">
              <span className="sr-only">Toggle email notifications</span>
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <span className="relative inline-block w-9 mr-2 h-5 bg-border rounded-full peer peer-required:peer-valid:aria-invalid=after peer-required:peer-focus:focus-visible:outline-none peer-required:peer-focus:focus-visible:ring-1 peer-required:peer-focus:focus-visible:ring-ring peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-input peer-checked:bg-primary peer-checked:after:absolute peer-checked:after:checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:border-primary"></span>
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-xs text-muted-foreground">Receive real-time alerts in the app.</p>
            </div>
            <Button variant="outline" size="sm" className="relative">
              <span className="sr-only">Toggle push notifications</span>
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <span className="relative inline-block w-9 mr-2 h-5 bg-border rounded-full peer peer-required:peer-valid:aria-invalid=after peer-required:peer-focus:focus-visible:outline-none peer-required:peer-focus:focus-visible:ring-1 peer-required:peer-focus:focus-visible:ring-ring peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-input peer-checked:bg-primary peer-checked:after:absolute peer-checked:after:checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:border-primary"></span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
